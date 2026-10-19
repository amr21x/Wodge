import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Fragment } from "react";
import { SidebarItemBtn } from "../../workspace/components/sidebar-item-btn";

export function FoldersBreadcrumbs() {
  const { workspaceSlug, teamId, path } = useParams<{
    workspaceSlug: string;
    teamId: string;
    path: string[];
  }>();

  const router = useRouter();

  return (
    <Breadcrumb>
      <BreadcrumbList className="gap-0 sm:gap-0">
        <BreadcrumbItem>
          <SidebarItemBtn
            Icon={Home}
            onClick={() => {
              router.push(`/${workspaceSlug}/resources/${teamId}/`);
            }}
          />
        </BreadcrumbItem>

        {path?.length > 0 && <BreadcrumbSeparator className="pr-1" />}
        {path?.length > 3 ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
            <BreadcrumbSeparator className="px-1" />
            {path?.slice(path.length - 2).map((p, i) => (
              <Fragment key={i}>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      href={`/${workspaceSlug}/resources/${teamId}/${path.slice(path.length - 2, i + path.length - 2 + 1).join("/")}`}
                    >
                      {p}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {i === 1 ? null : <BreadcrumbSeparator className="px-1" />}
              </Fragment>
            ))}
          </>
        ) : (
          <>
            {path?.map((p, i) => (
              <Fragment key={i}>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      href={`/${workspaceSlug}/resources/${teamId}/${path.slice(0, i + 1).join("/")}`}
                    >
                      {p}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {i === path.length - 1 ? null : (
                  <BreadcrumbSeparator className="px-1" />
                )}
              </Fragment>
            ))}
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
