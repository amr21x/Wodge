#!/usr/bin/env bash
# Local development secrets from Bitwarden Secrets Manager.
#
# Secrets are stored per application in the operating system credential store
# (macOS Keychain, Windows Credential Manager for WSL/Git Bash, or a Linux
# Secret Service keyring), never in files. `run` reads them from that store
# only, so it works offline and does not need bws. Bitwarden is contacted only
# by `setup` and `refresh`, using a read-only machine-account token that is kept
# in the same store. Every clone and worktree of the application resolves the
# same entries, so setup is never repeated.
#
# Usage: scripts/secrets.sh setup | refresh | list | run -- <command...> | forget
#
# Optional settings:
#   BWS_APP               Credential entry name; defaults to package.json "name".
#   BWS_CREDENTIAL_STORE  Force macos, windows or secret-service.
#   BWS_INSTALL_DIR       Where bws is installed when missing; ~/.local/bin.
#   BWS_SERVER_URL        Self-hosted or EU server, read directly by bws.
set -euo pipefail
umask 077

# Pinned official release; checksums come from bws-sha256-checksums-2.1.0.txt.
BWS_VERSION=2.1.0
BWS_INSTALL_DIR=${BWS_INSTALL_DIR:-$HOME/.local/bin}
# Windows limits one credential to 2560 bytes, so larger values are split.
CHUNK_SIZE=2000
POSIX_NAME='^[A-Za-z_][A-Za-z0-9_]*$'

SELF=$0
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null ||
  dirname "$SCRIPT_DIR")

die() {
  printf 'secrets: %s\n' "$*" >&2
  exit 1
}

info() {
  printf 'secrets: %s\n' "$*" >&2
}

usage() {
  cat >&2 <<EOF
Usage: $SELF <command>

  setup             Store the project ID and machine-account token, then refresh.
  refresh           Download the project's secrets into the credential store.
  list              Show the names of the stored secrets (not values).
  run -- <command>  Run a command with the stored secrets as environment variables.
  forget            Delete the stored token and secrets for this application.
EOF
}

resolve_app() {
  local name=${BWS_APP:-}
  if [[ -z $name && -f $ROOT/package.json ]]; then
    name=$(sed -n 's/^[{[:space:]]*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
      "$ROOT/package.json" | head -n 1)
  fi
  [[ -n $name ]] || die "cannot determine the application name; set BWS_APP."
  # The name is embedded in credential-store commands, so keep it to safe characters.
  [[ $name =~ ^[A-Za-z0-9@._/-]+$ ]] ||
    die "application name '$name' may only contain letters, digits and @._/-"
  APP=$name
}

# --- Credential store -------------------------------------------------------
# store_read/store_write/store_delete operate on one entry; store_read prints
# the value, and store_read/store_delete return 3 when the entry is missing.
# Values are limited to base64 and access-token characters by the callers.

detect_store() {
  if [[ -n ${BWS_CREDENTIAL_STORE:-} ]]; then
    STORE=$BWS_CREDENTIAL_STORE
  else
    case "$(uname -s)" in
      Darwin) STORE=macos ;;
      MINGW* | MSYS* | CYGWIN*) STORE=windows ;;
      Linux)
        if grep -qi microsoft /proc/sys/kernel/osrelease 2>/dev/null; then
          STORE=windows
        else
          STORE=secret-service
        fi
        ;;
      *) die "unsupported operating system '$(uname -s)'." ;;
    esac
  fi

  case $STORE in
    macos)
      command -v security >/dev/null || die "macOS 'security' tool not found."
      ;;
    windows)
      command -v powershell.exe >/dev/null ||
        die "powershell.exe not found; enable WSL Windows interop to use Windows Credential Manager."
      ;;
    secret-service)
      command -v secret-tool >/dev/null ||
        die "secret-tool not found. Install libsecret-tools (Debian/Ubuntu) or libsecret (Fedora/Arch) and run a Secret Service keyring such as GNOME Keyring, KWallet or KeePassXC."
      ;;
    *) die "BWS_CREDENTIAL_STORE must be macos, windows or secret-service." ;;
  esac
}

store_label() {
  case $STORE in
    macos) echo "macOS Keychain" ;;
    windows) echo "Windows Credential Manager" ;;
    secret-service) echo "Secret Service keyring" ;;
  esac
}

# Windows Credential Manager through the Win32 credential API. The value is
# passed on stdin so it never appears in process arguments.
windows_credential() {
  local mode=$1 target=$2 script encoded
  # Win32 calls and their error codes stay in C#, because PowerShell overwrites
  # the last Win32 error before a script could read it.
  script=$(
    cat <<'EOF'
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class BwsCredential {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  struct Credential {
    public int Flags; public int Type; public string TargetName; public string Comment;
    public int LastWrittenLow; public int LastWrittenHigh;
    public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist;
    public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }

  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern bool CredReadW(string target, int type, int flags, out IntPtr credential);
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern bool CredWriteW(ref Credential credential, int flags);
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern bool CredDeleteW(string target, int type, int flags);
  [DllImport("advapi32.dll")]
  static extern void CredFree(IntPtr buffer);

  const int Generic = 1;
  // Persist for this Windows user on this machine; the credential does not roam.
  const int LocalMachine = 2;

  // Each operation returns 0 or the Windows error code.
  public static int Read(string target, out string value) {
    value = null;
    IntPtr pointer;
    if (!CredReadW(target, Generic, 0, out pointer)) return Marshal.GetLastWin32Error();
    try {
      var credential = (Credential)Marshal.PtrToStructure(pointer, typeof(Credential));
      var bytes = new byte[credential.CredentialBlobSize];
      Marshal.Copy(credential.CredentialBlob, bytes, 0, bytes.Length);
      value = Encoding.UTF8.GetString(bytes);
      return 0;
    } finally {
      CredFree(pointer);
    }
  }

  public static int Write(string target, string value) {
    var bytes = Encoding.UTF8.GetBytes(value);
    var blob = Marshal.AllocHGlobal(bytes.Length);
    try {
      Marshal.Copy(bytes, 0, blob, bytes.Length);
      var credential = new Credential {
        Type = Generic, Persist = LocalMachine, TargetName = target, UserName = "bws",
        CredentialBlobSize = bytes.Length, CredentialBlob = blob
      };
      return CredWriteW(ref credential, 0) ? 0 : Marshal.GetLastWin32Error();
    } finally {
      Marshal.FreeHGlobal(blob);
    }
  }

  public static int Delete(string target) {
    return CredDeleteW(target, Generic, 0) ? 0 : Marshal.GetLastWin32Error();
  }
}
'@
$target = '__TARGET__'
$value = $null
switch ('__MODE__') {
  'read' {
    $code = [BwsCredential]::Read($target, [ref]$value)
    if ($code -eq 0) { [Console]::Out.Write($value) }
  }
  'write' { $code = [BwsCredential]::Write($target, [Console]::In.ReadToEnd()) }
  'delete' { $code = [BwsCredential]::Delete($target) }
}
if ($code -eq 1168) { exit 3 } # ERROR_NOT_FOUND
if ($code -ne 0) {
  [Console]::Error.WriteLine("Windows credential API failed with error $code")
  exit 1
}
EOF
  )
  script=${script//__TARGET__/$target}
  script=${script//__MODE__/$mode}
  encoded=$(printf '%s' "$script" | iconv -f UTF-8 -t UTF-16LE | base64 | tr -d '\n')
  if [[ $mode == write ]]; then
    powershell.exe -NoProfile -NonInteractive -EncodedCommand "$encoded"
  else
    powershell.exe -NoProfile -NonInteractive -EncodedCommand "$encoded" </dev/null
  fi
}

store_read() {
  local target=$1 value status=0 errors
  errors=$(mktemp)
  case $STORE in
    macos)
      value=$(security find-generic-password -s "$target" -a bws -w 2>"$errors") || status=$?
      [[ $status -eq 44 ]] && status=3
      ;;
    windows)
      value=$(windows_credential read "$target" 2>"$errors") || status=$?
      ;;
    secret-service)
      value=$(secret-tool lookup service bws entry "$target" 2>"$errors") || status=$?
      # secret-tool exits 1 without output when the entry does not exist.
      [[ $status -eq 1 && ! -s $errors ]] && status=3
      ;;
  esac
  if [[ $status -ne 0 && $status -ne 3 ]]; then
    cat "$errors" >&2
  fi
  rm -f "$errors"
  [[ $status -eq 0 ]] || return "$status"
  printf '%s' "${value%$'\r'}"
}

store_write() {
  local target=$1 value=$2
  case $STORE in
    macos)
      # Commands are read from stdin so values are not visible in process arguments.
      printf 'add-generic-password -U -s "%s" -a bws -l "%s" -w "%s"\n' \
        "$target" "Bitwarden Secrets Manager ($target)" "$value" | security -i >/dev/null
      ;;
    windows)
      printf '%s' "$value" | windows_credential write "$target"
      ;;
    secret-service)
      printf '%s' "$value" |
        secret-tool store --label="Bitwarden Secrets Manager ($target)" service bws entry "$target"
      ;;
  esac
}

store_delete() {
  local target=$1 status=0
  case $STORE in
    macos)
      security delete-generic-password -s "$target" -a bws >/dev/null 2>&1 || status=$?
      [[ $status -eq 44 ]] && status=3
      ;;
    windows) windows_credential delete "$target" || status=$? ;;
    secret-service)
      # secret-tool clear succeeds even when nothing matches.
      if store_read "$target" >/dev/null; then
        secret-tool clear service bws entry "$target" || status=$?
      else
        status=$?
      fi
      ;;
  esac
  return "$status"
}

# --- Entries ----------------------------------------------------------------
# Each item ("token" or "secrets") is stored as bws/<app>/<item>. The first
# entry holds "<chunk count>:<data>"; further chunks are bws/<app>/<item>#<n>.

entry() {
  echo "bws/$APP/$1"
}

item_read() {
  local target first count data i part
  target=$(entry "$1")
  first=$(store_read "$target") || return
  count=${first%%:*}
  data=${first#*:}
  [[ $count =~ ^[0-9]+$ && $first == *:* ]] || return 4
  for ((i = 1; i < count; i++)); do
    part=$(store_read "$target#$i") || return 4
    data+=$part
  done
  printf '%s' "$data"
}

item_write() {
  local target value=$2 count i status=0
  target=$(entry "$1")
  count=$(((${#value} + CHUNK_SIZE - 1) / CHUNK_SIZE))
  ((count > 0)) || count=1
  # Later chunks first, so the count in the first entry never points at missing data.
  for ((i = 1; i < count; i++)); do
    store_write "$target#$i" "${value:i*CHUNK_SIZE:CHUNK_SIZE}"
  done
  store_write "$target" "$count:${value:0:CHUNK_SIZE}"
  # Remove chunks left over from a previous, larger value.
  for ((i = count; ; i++)); do
    store_delete "$target#$i" 2>/dev/null || status=$?
    [[ $status -eq 0 ]] || break
  done
  [[ $(item_read "$1") == "$value" ]] ||
    die "could not save $target to the $(store_label)."
}

item_delete() {
  local target i status=0
  target=$(entry "$1")
  store_delete "$target" || return
  for ((i = 1; ; i++)); do
    store_delete "$target#$i" 2>/dev/null || status=$?
    [[ $status -eq 0 ]] || break
  done
}

# Loads PROJECT_ID and ACCESS_TOKEN from the stored "<project-id>:<token>" value.
load_token() {
  local value status=0
  value=$(item_read token) || status=$?
  case $status in
    0) ;;
    3) die "no Bitwarden access token stored for '$APP'. Run: $SELF setup" ;;
    4) die "the stored token for '$APP' is malformed. Run: $SELF setup" ;;
    *) die "could not read the token for '$APP' from the $(store_label)." ;;
  esac
  PROJECT_ID=${value%%:*}
  ACCESS_TOKEN=${value#*:}
  [[ -n $PROJECT_ID && -n $ACCESS_TOKEN && $value == *:* ]] ||
    die "the stored token for '$APP' is malformed. Run: $SELF setup"
}

# Prints the stored base64 payload of NUL-separated KEY=VALUE records.
read_secrets() {
  local payload status=0
  payload=$(item_read secrets) || status=$?
  case $status in
    0) ;;
    3) die "no secrets stored for '$APP'. Run: $SELF refresh (or $SELF setup on a new machine)" ;;
    4) die "the stored secrets for '$APP' are incomplete. Run: $SELF refresh" ;;
    *) die "could not read the secrets for '$APP' from the $(store_label)." ;;
  esac
  printf '%s' "$payload"
}

decode_secrets() {
  [[ -z $1 ]] || printf '%s' "$1" | base64 -d
}

# --- bws ----------------------------------------------------------------------

sha256() {
  if command -v sha256sum >/dev/null; then
    sha256sum "$1" | cut -d ' ' -f 1
  else
    shasum -a 256 "$1" | cut -d ' ' -f 1
  fi
}

install_bws() {
  local arch target checksum asset binary=bws
  case "$(uname -m)" in
    x86_64 | amd64) arch=x86_64 ;;
    aarch64 | arm64) arch=aarch64 ;;
    *) die "no bws release for CPU '$(uname -m)'; install bws manually." ;;
  esac
  case "$(uname -s)" in
    # The static musl build runs on every Linux distribution, including WSL.
    Linux) target=$arch-unknown-linux-musl ;;
    Darwin) target=macos-universal ;;
    MINGW* | MSYS* | CYGWIN*)
      target=$arch-pc-windows-msvc
      binary=bws.exe
      ;;
    *) die "no bws release for '$(uname -s)'; install bws manually." ;;
  esac
  case $target in
    x86_64-unknown-linux-musl) checksum=f59ee150e42b82128d437087e9bac920053c6bfddcb960d20ce9386e5ac9bba6 ;;
    aarch64-unknown-linux-musl) checksum=eb0f1ae61d1c3b74244d2841233276e05c77e8be4da197ed90fc6248387005e1 ;;
    macos-universal) checksum=286159545c7c834d93785c5a86e91d51026a5cc9858713936f391beb1ead2524 ;;
    x86_64-pc-windows-msvc) checksum=8d6f2b51beb6f992b5b1de8b85a98bdf18de74096b724d17fa06219fc23f2bd5 ;;
    aarch64-pc-windows-msvc) checksum=ba18adeb5d123481211c47c4e4d0ad6d81a6b0139150704785542fdee542e583 ;;
  esac
  command -v curl >/dev/null || die "curl is required to install bws."
  command -v unzip >/dev/null || die "unzip is required to install bws."

  asset=bws-$target-$BWS_VERSION.zip
  info "bws not found; installing bws $BWS_VERSION to $BWS_INSTALL_DIR"
  (
    work=$(mktemp -d)
    trap 'rm -rf "$work"' EXIT
    curl -fsSL --proto '=https' --tlsv1.2 -o "$work/$asset" \
      "https://github.com/bitwarden/sdk-sm/releases/download/bws-v$BWS_VERSION/$asset" ||
      die "download of $asset failed."
    [[ $(sha256 "$work/$asset") == "$checksum" ]] ||
      die "checksum mismatch for $asset; refusing to install."
    unzip -q "$work/$asset" -d "$work/unpacked"
    [[ -f $work/unpacked/$binary ]] || die "$asset does not contain $binary."
    mkdir -p "$BWS_INSTALL_DIR"
    install -m 0755 "$work/unpacked/$binary" "$BWS_INSTALL_DIR/$binary"
  )
  BWS=$BWS_INSTALL_DIR/$binary
  case ":$PATH:" in
    *":$BWS_INSTALL_DIR:"*) ;;
    *) info "add $BWS_INSTALL_DIR to PATH to use bws directly." ;;
  esac
}

ensure_bws() {
  if command -v bws >/dev/null; then
    BWS=$(command -v bws)
  elif [[ -x $BWS_INSTALL_DIR/bws ]]; then
    BWS=$BWS_INSTALL_DIR/bws
  elif [[ -x $BWS_INSTALL_DIR/bws.exe ]]; then
    BWS=$BWS_INSTALL_DIR/bws.exe
  else
    install_bws
  fi
}

# Explains a failed bws call; the stored token and secrets are left unchanged.
bws_failure() {
  local errors=$1
  # Show the bws error without its source location and backtrace hints.
  printf '%s\n' "$errors" | sed -e '/^Location:/,$d' -e '/^[[:space:]]*$/d' -e 's/^/  bws: /' >&2
  case $errors in
    *invalid_client* | *"decryption key"* | *[Aa]"ccess token"*)
      die "the access token is invalid, expired or revoked. Create a new access token for the machine account in Bitwarden, then run: $SELF setup"
      ;;
    *404* | *[Nn]"ot found"* | *[Ff]orbidden* | *403*)
      die "project $PROJECT_ID was not found or the machine account cannot read it. In Bitwarden, open the machine account's Projects tab and grant it Can read access to the project, then retry."
      ;;
    *)
      die "the Bitwarden request failed (network or server error). Stored secrets were not changed."
      ;;
  esac
}

# Prints the output of a bws command, or explains its failure and exits. The
# token is passed through the environment only, never process arguments.
bws_query() {
  local errors output status=0
  errors=$(mktemp)
  output=$(BWS_ACCESS_TOKEN=$ACCESS_TOKEN "$BWS" "$@" -c no 2>"$errors") || status=$?
  if [[ $status -ne 0 ]]; then
    output=$(cat "$errors")
    rm -f "$errors"
    bws_failure "$output"
  fi
  rm -f "$errors"
  printf '%s' "$output"
}

# Downloads the project's secrets and prints them as base64-encoded,
# NUL-separated KEY=VALUE records. Encoding keeps every credential store value
# to safe characters, and loading never evaluates stored text.
fetch_secrets() {
  local names valid=() name dump payload
  # Without project access Bitwarden lists no secrets instead of failing, so
  # check access explicitly before trusting an empty list.
  bws_query project get "$PROJECT_ID" -o none >/dev/null
  names=$(bws_query secret list "$PROJECT_ID" -o json)
  # Only key names are extracted here; JSON escaping keeps values from matching.
  while IFS= read -r name; do
    [[ -n $name ]] || continue
    if [[ $name =~ $POSIX_NAME ]]; then
      valid+=("$name")
    else
      info "skipping secret '$name': not a valid environment variable name."
    fi
  done < <({ grep -o '"key": *"[^"]*"' <<<"$names" || true; } | sed 's/^"key": *"//; s/"$//')

  if ((${#valid[@]} == 0)); then
    printf ''
    return
  fi
  # bws decrypts the values into a clean environment; the names are validated,
  # so they are safe to embed in the shell command bws runs.
  dump="for name in ${valid[*]}; do if [[ -n \${!name+set} ]]; then printf '%s=%s\\0' \"\$name\" \"\${!name}\"; fi; done | base64 | tr -d '\\n'"
  payload=$(BWS_ACCESS_TOKEN=$ACCESS_TOKEN "$BWS" run --project-id "$PROJECT_ID" \
    --no-inherit-env --shell bash -- "$dump") ||
    die "the Bitwarden request failed. Stored secrets were not changed."
  [[ $payload =~ ^[A-Za-z0-9+/=]*$ ]] || die "unexpected output from bws run."
  printf '%s' "$payload"
}

# --- Commands -----------------------------------------------------------------

cmd_setup() {
  local token status=0
  item_read token >/dev/null || status=$?
  [[ $status -eq 0 ]] && info "the stored token for '$APP' will be replaced."

  read -r -p "Bitwarden project ID for '$APP': " PROJECT_ID
  read -r -s -p "Machine account access token (hidden): " token
  printf '\n' >&2
  ACCESS_TOKEN=$token

  [[ $PROJECT_ID =~ ^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$ ]] ||
    die "the project ID must be a UUID."
  # Access tokens look like 0.<uuid>.<secret>:<base64 key>.
  [[ $token =~ ^[A-Za-z0-9._:+/=-]+$ && $token == *:* ]] ||
    die "that does not look like a machine-account access token."

  # Fetching first proves the token works before anything is stored.
  local payload
  payload=$(fetch_secrets)
  store_secrets "$payload"
  item_write token "$PROJECT_ID:$ACCESS_TOKEN"
  info "saved the token for '$APP' to the $(store_label)."
}

cmd_refresh() {
  local payload
  load_token
  # A failed download exits here, leaving the stored secrets unchanged.
  payload=$(fetch_secrets)
  store_secrets "$payload"
}

store_secrets() {
  local payload=$1 count
  item_write secrets "$payload"
  count=$(decode_secrets "$payload" | tr -cd '\0' | wc -c | tr -d ' ')
  info "stored $count secrets for '$APP' in the $(store_label)."
}

cmd_list() {
  local payload record count=0
  payload=$(read_secrets)
  while IFS= read -r -d '' record; do
    printf '%s\n' "${record%%=*}"
    count=$((count + 1))
  done < <(decode_secrets "$payload")
  ((count > 0)) || info "no secrets stored for '$APP'."
}

cmd_run() {
  local dev_vars payload record names=()
  [[ ${1:-} == -- ]] && shift
  [[ $# -gt 0 ]] || die "missing command. Usage: $SELF run -- <command...>"

  # Wrangler silently prefers .dev.vars over environment variables.
  dev_vars=$(find "$ROOT" \( -name node_modules -o -name .git \) -prune -o \
    -name .dev.vars -print | head -n 1)
  [[ -z $dev_vars ]] ||
    die "$dev_vars would override the stored secrets in Wrangler; delete it first."

  # A store failure exits here, before the command starts.
  payload=$(read_secrets)
  while IFS= read -r -d '' record; do
    [[ ${record%%=*} =~ $POSIX_NAME ]] || die "the stored secrets are corrupt. Run: $SELF refresh"
    export "$record"
    names+=("${record%%=*}")
  done < <(decode_secrets "$payload")
  ((${#names[@]} > 0)) || info "no secrets stored for '$APP'; running without them."

  # Wrangler reads Worker secrets from the environment only when this is set;
  # it is harmless for other tools.
  export CLOUDFLARE_INCLUDE_PROCESS_ENV=true
  exec "$@"
}

cmd_forget() {
  local item status
  for item in token secrets; do
    status=0
    item_delete "$item" || status=$?
    case $status in
      0) info "deleted $(entry "$item") from the $(store_label)." ;;
      3) ;;
      *) die "could not delete $(entry "$item") from the $(store_label)." ;;
    esac
  done
}

main() {
  local command=${1:-}
  [[ $# -gt 0 ]] && shift
  case $command in
    setup | refresh | list | run | forget) ;;
    -h | --help | help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 1
      ;;
  esac

  resolve_app
  detect_store
  case $command in
    setup | refresh) ensure_bws ;;
  esac
  "cmd_$command" "$@"
}

main "$@"
