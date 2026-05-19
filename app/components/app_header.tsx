import AppTitle from "./app_title";
import ButtonBar from "./button_bar";
import SignIn from "./sign_in";
import UserAvatar from "./user_avatar";

export default function AppHeader() {
  return (
    <header className="w-full border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-3">
        <AppTitle />
        <div className="flex items-center gap-3">
          <ButtonBar />
          <UserAvatar />
          <SignIn />
        </div>
      </div>
    </header>
  );
}
