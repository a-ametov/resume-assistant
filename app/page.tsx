import AppHeader from "./components/app_header";
import ViewSidebarLayout from "./components/view_sidebar_layout";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <AppHeader />
      <ViewSidebarLayout />
    </main>
  );
}

