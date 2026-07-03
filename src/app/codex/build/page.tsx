import { redirect } from "next/navigation";

// The rule builder was replaced by the "Suggest a rule" form; old links land there.
export default function BuildRedirect() {
  redirect("/codex/suggest");
}
