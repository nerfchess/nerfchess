// The Nerf Chess team, on the record (brief section 18). One place to change
// a name or a title: the /about team section, the Organization and Person
// structured data, and the footer credit all read this list.
//
// Official means true. Names and titles only: no ages, schools, cities,
// photos or any other personal detail, and no claim beyond what each role is
// responsible for at Nerf Chess. The one-line role sentences below describe
// the job, not the person; the owner signs them off (see the E2 slice file).

export type TeamMember = {
  /** Stable anchor and structured-data id fragment. */
  slug: string;
  name: string;
  title: string;
  /** Co-founders are listed as founders in the Organization data; the rest
   *  of the team as members. */
  founder: boolean;
  /** What this person is responsible for at Nerf Chess, in one sentence. */
  role: string;
};

export const TEAM: TeamMember[] = [
  {
    slug: "joseph-leung",
    name: "Joseph Leung",
    title: "Co-founder and Chief Executive Officer",
    founder: true,
    role: "Leads Nerf Chess as a whole: where the game is going, what gets built next, and how it reaches players.",
  },
  {
    slug: "timmy-chen",
    name: "Timmy Chen",
    title: "Co-founder and Chief Technology Officer",
    founder: true,
    role: "Leads the technology behind Nerf Chess: the game server, the rules engine and the site you play on.",
  },
  {
    slug: "robert-wang",
    name: "Robert Wang",
    title: "Head of Game Design",
    founder: false,
    role: "Leads the game design: the cards, the two modes, and how the tiers are balanced against each other.",
  },
];

/** The /about section the footer credit links to. */
export const TEAM_ANCHOR = "team";
