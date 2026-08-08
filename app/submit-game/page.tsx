import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter, PublicHeader } from "../components/PublicChrome";
import SubmissionForm from "./submission-form";

export const metadata: Metadata = { title: "Submit a game for review | MyRPG", description: "Share an official game and optional authorized artwork with the MyRPG review desk. Every submission stays private until reviewed.", alternates: { canonical: "/submit-game" }, robots: { index: false, follow: true } };

export default function SubmitGamePage() {
  return <><PublicHeader /><main id="main-content" className="public-page submission-page">
    <nav aria-label="Breadcrumb" className="submission-breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Submit a game</span></nav>
    <header className="submission-hero"><p>MYRPG / CREATOR INTAKE</p><h1>Put your game on our radar.</h1><p>MyRPG is MMO-first and now accepts source-backed submissions for any digital game played on a screen. Jordan Hale&apos;s Live Service &amp; Games Desk routes each submission into a private evidence review — not directly to publication.</p></header>
    <section className="submission-layout">
      <aside className="submission-review-guide" aria-labelledby="review-guide-title">
        <p className="submission-guide-kicker">A QUICK START</p>
        <h2 id="review-guide-title">Help us review it faster.</h2>
        <ul><li>Working official website</li><li>Official announcement, press release, or store page</li><li>Clear lifecycle and platform details</li><li>Optional authorized 16:9 lead image</li></ul>
        <p className="submission-reassurance">No account, payment, player reviews, or social-media activity is required. Every submission starts private.</p>
        <Link className="submission-standards" href="/editorial-standards">Read editorial standards <span aria-hidden="true">→</span></Link>
      </aside>
      <SubmissionForm />
    </section>
  </main><PublicFooter /></>;
}
