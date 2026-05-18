import CompanyEntries from "./components/company_entries";
import EducationEntries from "./components/education_entries";
import AppHeader from "./components/app_header";
import Profile from "./components/profile";
import PositionContext from "./components/position_context";
import Skills from "./components/skills";
import Summary from "./components/summary";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
        <AppHeader />
      <Profile />
      <PositionContext />
      <Summary />
      <Skills />
      <CompanyEntries />
      <EducationEntries />
    </main>
  );
}

