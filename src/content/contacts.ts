import { content } from ".";
import { text } from "./text";

/** The owner's contact links that are filled in; placeholders are dropped. */
export function contactLinks() {
  const { email, github, linkedin } = content.owner.contact;
  return [
    { label: "Email", href: text(email) && `mailto:${email}` },
    { label: "GitHub", href: text(github) },
    { label: "LinkedIn", href: text(linkedin) },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href));
}
