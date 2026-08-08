import { Download, FileText, Folder, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  getShare,
  sharedDownloadUrl,
  type NetdiskFile,
  type NetdiskFolder,
} from "@/services/netdisk";

interface SharedFolderListing {
  name: string;
  kind: "folder";
  folders: NetdiskFolder[];
  files: NetdiskFile[];
}

export default function SharePage() {
  const { token = "" } = useParams<{ token: string }>();
  const [data, setData] = useState<
    | { name: string; kind: "file"; size?: number; downloadUrl?: string }
    | SharedFolderListing
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getShare(token)
      .then((result) => {
        if (!cancelled) setData(result as typeof data);
      })
      .catch((loadError) => {
        if (!cancelled) setError((loadError as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-5 py-10 text-mist-100">
      <div className="w-full max-w-xl">
        <Link to="/" className="text-xs text-mist-500 hover:text-mist-300">
          ← 返回首页
        </Link>
        <div className="mt-4 rounded-panel border border-white/10 bg-white/[0.03] p-6 shadow-soft backdrop-blur-md sm:p-8">
          {error ? (
            <p className="text-sm text-red-200">{error}</p>
          ) : !data ? (
            <div className="flex items-center gap-3 text-mist-400">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span className="text-sm">正在加载分享内容</span>
            </div>
          ) : data.kind === "file" ? (
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-lilac-300" aria-hidden="true" />
              <h1 className="mt-5 text-2xl font-bold">{data.name}</h1>
              <p className="mt-2 text-sm text-mist-400">
                {data.size ? `${Math.round(data.size / 1024)} KB` : "文件分享"}
              </p>
              <ButtonLink
                href={sharedDownloadUrl(token)}
                variant="primary"
                className="mt-8"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                下载文件
              </ButtonLink>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <Folder className="h-8 w-8 text-mint-300" aria-hidden="true" />
                <div>
                  <h1 className="text-xl font-bold">{data.name}</h1>
                  <p className="text-sm text-mist-400">文件夹分享</p>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                {data.folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                  >
                    <Folder className="h-4 w-4 text-mint-300" aria-hidden="true" />
                    <span className="truncate text-sm text-mist-200">{folder.name}</span>
                  </div>
                ))}
                {data.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                  >
                    <FileText className="h-4 w-4 text-lilac-300" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm text-mist-200">
                      {file.name}
                    </span>
                    <span className="text-xs text-mist-500">
                      {Math.round(file.size / 1024)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
