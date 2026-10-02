import bounties from "./bounties.json";

const prompt = document.querySelector<HTMLElement>("#agent-prompt");
const copyStatus = document.querySelector<HTMLElement>("#copy-status");
document.querySelector("#copy-prompt")?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(prompt?.textContent ?? "");
    if (copyStatus) copyStatus.textContent = "Copied. Paste it into your coding agent.";
  } catch {
    if (copyStatus) copyStatus.textContent = "Select the prompt above and copy it manually.";
  }
});

type Provider = {
  name: string;
  id: string;
  country: string;
  currencies: string[];
  source: string;
};
type Integration = {
  name: string;
  country: string;
  currency: string;
  href: string;
  logo: string | null;
  mark: string;
  amount?: number;
  scope: string;
};

const list = document.querySelector("#provider-list");
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

let catalog: Provider[] = [];
let catalogUnavailable = false;
let filter = "all";
const filters = document.querySelectorAll<HTMLButtonElement>("[data-filter]");
const catalogStatus = document.querySelector<HTMLElement>("#catalog-status");
for (const button of filters) {
  button.addEventListener("click", () => {
    filter = button.dataset.filter ?? "all";
    for (const item of filters) item.setAttribute("aria-pressed", String(item === button));
    render();
  });
}

function render() {
  if (!list) return;
  list.replaceChildren();
  const integrations: Integration[] = [
    ...catalog.map((provider) => ({
      name: provider.name,
      scope: "Experimental adapter",
      country: provider.country,
      currency: provider.currencies.join(", "),
      href: provider.source,
      logo: provider.id === "us/mercury" ? "/logos/mercury.svg" : null,
      mark: provider.name.slice(0, 2).toUpperCase(),
    })),
    ...bounties.map((bounty) => ({
      name: bounty.name,
      scope: bounty.scope,
      country: bounty.country,
      currency: bounty.currency,
      href: bounty.issue,
      logo: bounty.logo,
      mark: bounty.mark,
      amount: bounty.amount,
    })),
  ];

  const visible = integrations.filter(
    (item) =>
      filter === "all" ||
      (filter === "adapter" ? item.amount === undefined : item.amount !== undefined),
  );
  if (catalogStatus) {
    catalogStatus.textContent = catalogUnavailable
      ? "The adapter catalog could not load. Proposed rewards are shown; reload to see adapters."
      : `${catalog.length} experimental adapter · ${bounties.length} proposed rewards · ${visible.length} shown`;
  }
  for (const integration of visible) {
    const available = integration.amount === undefined;
    const card = document.createElement("a");
    card.className = `integration-tile ${available ? "is-available" : "is-bounty"}`;
    card.href = integration.href;
    const place = countryNames.of(integration.country) ?? integration.country;
    card.setAttribute(
      "aria-label",
      available
        ? `${integration.name}, ${place}, experimental integration in the repository. View scope and limitations.`
        : `${integration.name}, ${place}, proposed $${integration.amount} reward. Confirm funding and assignment in the issue.`,
    );
    const logo = document.createElement("span");
    logo.className = "integration-logo";
    if (integration.logo) {
      const img = document.createElement("img");
      img.src = integration.logo;
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", () => {
        img.remove();
        logo.textContent = integration.mark;
      });
      logo.append(img);
    } else {
      logo.textContent = integration.mark;
    }
    const name = document.createElement("strong");
    name.className = "integration-name";
    name.textContent = integration.name;
    const meta = document.createElement("span");
    meta.className = "integration-meta";
    meta.textContent = `${place} / ${integration.currency} · ${integration.scope}`;
    const status = document.createElement("span");
    status.className = "integration-status";
    status.textContent = available ? "In the library" : `Proposed $${integration.amount}`;
    const tooltip = document.createElement("span");
    tooltip.className = "integration-tooltip";
    tooltip.setAttribute("aria-hidden", "true");
    tooltip.textContent = available
      ? "View experimental scope"
      : `Proposed $${integration.amount}; check funding and scope`;
    card.append(logo, name, meta, status, tooltip);
    list.append(card);
  }

  const add = document.createElement("a");
  add.className = "integration-tile add-integration";
  add.href = "https://github.com/zkp2p/peer-link/issues/new?template=bank-request.md";
  add.setAttribute("aria-label", "Propose an integration for your bank on GitHub");
  const icon = document.createElement("span");
  icon.className = "add-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "+";
  const title = document.createElement("strong");
  title.textContent = "Add your bank";
  const caption = document.createElement("span");
  caption.textContent = "Propose an integration";
  add.append(icon, title, caption);
  list.insertBefore(add, list.querySelector(".is-bounty"));
}

fetch("/catalog.json")
  .then((response) => {
    if (!response.ok) throw new Error("Catalog unavailable");
    return response.json();
  })
  .then((data: { providers: Provider[] }) => {
    if (!Array.isArray(data.providers)) throw new Error("Invalid catalog");
    catalog = data.providers;
    render();
  })
  .catch(() => {
    catalogUnavailable = true;
    render();
  });
