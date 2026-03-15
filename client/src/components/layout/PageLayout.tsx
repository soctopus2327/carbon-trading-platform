import type { ReactNode } from "react";

type PageLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
  compact?: boolean;
};

export default function PageLayout({
  title,
  description,
  children,
  compact = false,
}: PageLayoutProps) {
  let role: string | null = null;
  try {
    const rawUser = localStorage.getItem("user");
    role = rawUser ? JSON.parse(rawUser)?.role || null : null;
  } catch {
    role = null;
  }

  if (!role) role = localStorage.getItem("role");

  const isAdmin = role === "ADMIN";
  const onManagePeoplePage = window.location.pathname === "/manage-people";
  const onForumPage=window.location.pathname==="/forum";
  return (
    <main className="flex-1 bg-gray-50 flex flex-col min-h-0">
      <div
        className={`px-6 flex justify-between items-center border-b border-gray-200 bg-white ${
          compact ? "py-5" : "py-8"
        }`}
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {description && <p className="text-gray-600 text-sm mt-2">{description}</p>}
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => {
                if (onManagePeoplePage) return;
                window.history.pushState({}, "", "/manage-people");
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
              className={`px-6 py-2 rounded-lg shadow-md transition font-semibold ${
                onManagePeoplePage
                  ? "bg-blue-100 text-blue-700 cursor-default"
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg"
              }`}
            >
              Manage People
            </button>
          )}

          <button 
            onClick={()=>{
              if(onForumPage){
                return; 
              }
                window.history.pushState({}, "", "/forum");
                window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg hover:from-green-600 hover:to-green-700 transition font-semibold">
            Forum
          </button>
        </div>
      </div>

      <div className={`px-6 ${compact ? "py-5" : "py-8"} flex-1 overflow-y-auto min-h-0`}>
        {children}
      </div>
    </main>
  );
}
