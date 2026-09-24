import CommunityClient from "./CommunityClient";
import { readRecentGames } from "./recentGames";

// Server shell for the community hub: it reads the first page of Recent games
// so that list arrives in the HTML, then hands everything else to the client
// page, which loads its other panels as before.
export default async function CommunityPage() {
  const initialRecent = await readRecentGames();
  return <CommunityClient initialRecent={initialRecent} />;
}
