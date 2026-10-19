/** Preserve connection identity/state while checking each Yjs send against current flags. */
export function gatePageConnection<
  T extends { send(message: string | ArrayBuffer | ArrayBufferView): void },
>(connection: T, enabled: () => Promise<boolean>): T {
  let outgoing = Promise.resolve();
  return new Proxy(connection, {
    get(target, property) {
      if (property === "send") {
        return (message: string | ArrayBuffer | ArrayBufferView) => {
          outgoing = outgoing
            .then(async () => {
              if (await enabled()) target.send(message);
            })
            .catch(() => {});
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
