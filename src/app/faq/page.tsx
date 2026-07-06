import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";

export const metadata: Metadata = {
  title: "FAQ | Nerf Chess",
};

const FAQS = [
  {
    question: "Is this normal chess?",
    answer:
      "It begins from a chessboard, but not all standard chess rules survive. There is no checkmate or stalemate: the goal is usually to capture the enemy king.",
  },
  {
    question: "What are the two modes?",
    answer:
      "Nerf mode and Buff mode. In Nerf mode you pick a secret handicap from two cards and your opponent's stays hidden until the game ends; every 5 moves you draft a card: usually a hex that curses your opponent, sometimes a boon or item that helps you. In Buff mode nobody is handicapped: every 5 moves both players draft a buff and build the strongest army.",
  },
  {
    question: "What is a nerf?",
    answer:
      "A nerf is your secret rule in Nerf mode. It may restrict your moves or create a new way for you to lose. Your opponent has a different hidden rule. Buff mode has no nerfs at all.",
  },
  {
    question: "Can I see my opponent's rule?",
    answer:
      "Not during the game. You infer it from their play; it is revealed once the game is over.",
  },
  {
    question: "What is a buff?",
    answer:
      "The opposite of a nerf: a card that helps you. Some work quietly while you hold them, some fire the moment you pick them, and some wait until you choose to use them. Offers grow stronger as the game goes on. In Nerf mode the draft deals hexes instead: curses cast on your opponent, mixed with boons and items for yourself.",
  },
  {
    question: "What happens if I skip a buff draft?",
    answer:
      "Skipping banks the draft: your next offer rolls a tier stronger. Banking does not stack, so the trick is picking the right moment to be patient.",
  },
  {
    question: "Can I see what my opponent drafts?",
    answer:
      "No. Your opponent's picks stay hidden while the game runs; you only learn that they drafted and the card's tier. Everything is revealed when the game ends.",
  },
  {
    question: "Are games rated?",
    answer:
      "Queue games are rated: Nerf and Buff are separate pools, and each keeps its own rating. Friend games are casual.",
  },
  {
    question: "Can I play a friend?",
    answer:
      "Yes. Create a friend game, send the five-character code, and your opponent can join from their browser.",
  },
  {
    question: "Do friend games require accounts?",
    answer:
      "No accounts are required. Friend games use a short connection code to link two browsers for the match.",
  },
  {
    question: "Where can I learn the unusual rules?",
    answer:
      "The How to play guide covers the core changes, and the rules library lets you browse the available nerfs.",
  },
];

export default function FAQPage() {
  return (
    <InfoPageLayout
      eyebrow="questions"
      title="Frequently asked"
      intro="The short version: two modes, one board. Nerf mode is chess until your secret rule says otherwise; Buff mode is chess until the cards arrive. Here are the questions players usually ask first."
    >
      {FAQS.map((faq) => (
        <InfoSection key={faq.question} title={faq.question}>
          <p>{faq.answer}</p>
        </InfoSection>
      ))}

      <div className="pt-4 flex flex-wrap gap-3">
        <Link href="/tutorial" className="px-5 py-2.5 rounded-sm btn-leaf font-display">
          How to play
        </Link>
        <Link href="/codex" className="px-5 py-2.5 rounded-sm btn-ghost font-display">
          Browse rules
        </Link>
      </div>
    </InfoPageLayout>
  );
}
