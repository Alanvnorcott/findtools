import { Link } from "react-router-dom";
import { toolRegistry } from "../data/toolRegistry";
import { AdSlot } from "./AdSlot";
import { CopyButton, InlineMessage, SectionCard, ToolList } from "./common";

export function ToolShell({
  tool,
  isPinned,
  onTogglePinned,
  instructions,
  inputArea,
  outputArea,
  validation,
  sample,
  extra
}) {
  const relatedTools = toolRegistry
    .filter((entry) => entry.slug !== tool.slug)
    .map((entry) => {
      let score = 0;
      if (entry.category === tool.category) score += 2;
      score += entry.tags.filter((tag) => tool.tags.includes(tag)).length;
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
    .slice(0, 6)
    .map((item) => item.entry);

  const trustMessage = tool.supportsLocalFiles
    ? "Files stay in your browser. We do not upload, store, share, or retain the files you use here."
    : tool.retainsData === false
      ? "Input stays in your browser. We do not store, share, or retain what you enter into this tool."
      : tool.trustNote;

  return (
    <div className="tool-layout">
      <div className="tool-layout__main">
        <div className="page-heading">
          <div>
            <Link className="breadcrumb" to={`/category/${tool.category}`}>
              {tool.categoryName}
            </Link>
            <h1>{tool.name}</h1>
            <p>{tool.shortDescription}</p>
          </div>
          <div className="page-heading__actions">
            {onTogglePinned ? (
              <button className="button button--secondary" onClick={onTogglePinned} type="button">
                {isPinned ? "Unpin tool" : "Pin tool"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="tool-meta">
          <span className="chip">{tool.inputModel}</span>
          <span className="chip">{tool.outputModel}</span>
          <span className="chip">Local only</span>
          {tool.supportsLocalFiles ? <span className="chip">Local files</span> : null}
          {tool.aliases?.length ? <span className="chip">Canonical tool</span> : null}
        </div>

        <InlineMessage tone="success">{tool.trustNote || trustMessage}</InlineMessage>

        {/* AD_SLOT: TOOL_TOP */}
        <AdSlot placement="TOOL_TOP" />

        <div className="tool-columns">
          <SectionCard title="Input" subtitle={instructions}>
            {sample ? <div className="sample-block">{sample}</div> : null}
            {validation}
            {inputArea}
          </SectionCard>
          <SectionCard
            title="Result"
            subtitle="Results update locally in your browser. Nothing you enter here is retained."
            actions={tool.copyActions?.length ? <CopyButton getValue={tool.copyValue} /> : null}
          >
            {outputArea}
          </SectionCard>
        </div>

        {extra ? <SectionCard title="Notes">{extra}</SectionCard> : null}

        {tool.useCases?.length ? (
          <SectionCard title="Use Cases" subtitle="Common reasons people use this tool.">
            <ul className="content-list">
              {tool.useCases.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>
        ) : null}

        {tool.examples?.length ? (
          <SectionCard title="Examples" subtitle="Typical inputs or scenarios for this tool.">
            <ul className="content-list">
              {tool.examples.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>
        ) : null}

        {tool.faqs?.length ? (
          <SectionCard title="FAQs" subtitle="Short answers generated from the tool registry.">
            <div className="stack-sm">
              {tool.faqs.map((faq) => (
                <div className="faq-block" key={faq.question}>
                  <strong>{faq.question}</strong>
                  <p>{faq.answer}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {relatedTools.length ? (
          <SectionCard title="Related Tools" subtitle="Nearby tools based on intent, category, and tags.">
            <ToolList tools={relatedTools} />
          </SectionCard>
        ) : null}

        {/* AD_SLOT: TOOL_BOTTOM */}
        <AdSlot placement="TOOL_BOTTOM" />
      </div>
    </div>
  );
}
