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
    question: "What is a nerf?",
    answer:
      "A nerf is your secret rule for the game. It may restrict your moves or create a new way for you to lose. Your opponent has a different hidden rule.",
  },
  {
    question: "Can I see my opponent's rule?",
    answer:
      "Not during the game. You infer it from their play; it is revealed once the game is over.",
  },
  {
    question: "What is Draft mode?",
    answer:
      "An alternate ruleset. You pick your nerf from two cards at the start, then every few moves both players draft a buff card at the same time. You begin weakened and build your way back.",
  },
  {
    question: "What is a buff?",
    answer:
      "The opposite of a nerf: a card that helps you. Some work quietly while you hold them, some fire the moment you pick them, and some wait until you choose to use them. Offers grow stronger as the game goes on.",
  },
  {
    question: "What happens if I skip a buff draft?",
    answer:
      "Skipping banks the draft: your next offer rolls a tier stronger. Banking does not stack, so the trick is picking the right moment to be patient.",
  },
  {
    question: "Can I see what my opponent drafts?",
    answer:
      "That is up to whoever creates the game. Hidden picks keep the chaos: you never see what they chose. Visible picks show their nerf and draft choices for a more strategic game.",
  },
  {
    question: "Are Draft games rated?",
    answer:
      "Not yet. Ratings only move in Classic games while Draft is being balanced; a separate Draft rating may come later.",
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
      intro="The short version: it is chess until your secret rule says otherwise. Here are the questions players usually ask first."
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
