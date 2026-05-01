// Starter content templates the user can load into the editor.

export type StarterTemplate = {
  id: string;
  name: string;
  description: string;
  preheader: string;
  subject: string;
  html: string;
};

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "announcement",
    name: "Announcement",
    description: "Big news with one clear CTA.",
    subject: "Something new at Pixcellor",
    preheader: "A quick update we thought you'd want to see first.",
    html: `<h1>Something new from Pixcellor</h1>
<p>Hi there,</p>
<p>We've just launched something we're really excited about — and you're one of the first people we wanted to tell.</p>
<p><strong>Tell the story in 2–3 short sentences here.</strong> Keep it personal, like you're writing to a friend who happens to be a client.</p>
<p class="px-btn"><a href="https://pixcellor.com">See what's new</a></p>
<p>As always, hit reply if you have any questions — a real person reads every email.</p>
<p>— The Pixcellor team</p>`,
  },
  {
    id: "newsletter",
    name: "Newsletter",
    description: "Two short stories with a CTA.",
    subject: "This month at Pixcellor",
    preheader: "Two quick stories and one thing we made for you.",
    html: `<h1>This month at Pixcellor</h1>
<p>Hi there,</p>
<p>A short note on what we've been working on.</p>
<h2>Story one</h2>
<p>Brief paragraph about a recent project, behind-the-scenes moment, or insight from your work.</p>
<h2>Story two</h2>
<p>Another short paragraph — maybe a tip, a result you got for a client, or a shoutout.</p>
<p class="px-btn"><a href="https://pixcellor.com">See the full update</a></p>
<p>Until next time,<br>The Pixcellor team</p>`,
  },
  {
    id: "plain",
    name: "Plain note",
    description: "Personal, like a one-to-one email.",
    subject: "A quick note",
    preheader: "Just a short message, no big design.",
    html: `<p>Hi there,</p>
<p>I wanted to send a quick note about something I've been thinking about.</p>
<p>Write the message here in plain language — short paragraphs, no headings, no buttons. The goal is for this to feel like a personal email from one human to another.</p>
<p>Let me know what you think.</p>
<p>— Your name</p>`,
  },
];
