import { OnloadArgs } from "roamjs-components/types";
import getUidsFromId from "roamjs-components/dom/getUidsFromId";
import getUids from "roamjs-components/dom/getUids";
import extractTag from "roamjs-components/util/extractTag";
import getTextByBlockUid from "roamjs-components/queries/getTextByBlockUid";
import createOverlayObserver from "roamjs-components/dom/createOverlayObserver";

const ALIAS_PAGE_SYNONYM_OPTION_CLASSNAME = "roamjs-alias-page-synonyms";
const ALIAS_PAGE_SYNONYM_ATTRIBUTE = "data-roamjs-has-alias-option";

const createMenuOption = (menuOnClick: () => void) => {
  const option = document.createElement("li");
  const aTag = document.createElement("a");
  aTag.setAttribute(
    "label",
    `${window.roamAlphaAPI.platform.isIOS ? "Opt" : "Alt"}-A`
  );
  aTag.className = "bp3-menu-item bp3-popover-dismiss";
  option.appendChild(aTag);
  const optionText = document.createElement("div");
  optionText.className = "bp3-text-overflow-ellipsis bp3-fill";
  optionText.innerText = "Alias Page Synonyms";
  aTag.appendChild(optionText);
  const shortcut = document.createElement("span");
  shortcut.className = "bp3-menu-item-label";
  shortcut.innerText = "Alt-A";
  aTag.appendChild(shortcut);
  aTag.onclick = menuOnClick;
  option.className = ALIAS_PAGE_SYNONYM_OPTION_CLASSNAME;
  return option;
};

const getReplacer = (extensionAPI: OnloadArgs["extensionAPI"]) => {
  const useTags = extensionAPI.settings.get("use-tags");
  const uidWithAliases = (
    window.roamAlphaAPI.q(
      `[:find (pull ?parentPage [:block/uid :node/title]) (pull ?referencingBlock [[:block/string :as "text"]]) :where 
        [?referencedPage :node/title "Aliases"] 
        [?referencingBlock :block/refs ?referencedPage] 
        [?referencingBlock :block/page ?parentPage]]`
    ) as [{ uid: string; title: string }, { text: string }][]
  )
    .map(([{ uid, title }, { text }]) => ({
      uid,
      title,
      aliases: (
        text
          .replace(/^Aliases::/, "")
          .trim()
          .split(",") || []
      )
        .map((a: string) => extractTag(a.trim()))
        .filter((a: string) => !!a),
    }))
    .filter(({ title, aliases }) => !!title && aliases.length);
  const linkByAlias: { [key: string]: string } = {};
  uidWithAliases.forEach((p) => {
    const link = useTags ? `[[${p.title}]]` : `((${p.uid}))`;
    p.aliases.forEach((a: string) => (linkByAlias[a] = link));
    linkByAlias[p.title] = link;
  });

  const boundaryStart = "(^|[^a-zA-Z0-9_\\[\\].#])"; // Start boundary: matches start of line or non-word, non-markup characters
  const boundaryEnd = "([^a-zA-Z0-9_\\[\\]]|$)"; // End boundary: matches end of line or non-word, non-markup characters
  const negativeLookahead = "(?![^\\[]*\\])"; // Negative lookahead: to not replace if already in a link
  return (input: string) =>
    Object.keys(linkByAlias)
      .sort((a, b) => b.length - a.length)
      .reduce((prevText: string, alias: string) => {
        const escapedAlias = alias
          .replace(/\+/g, "\\+")
          .replace(/\[/g, "\\[")
          .replace(/\]/g, "\\]");
        const regexPattern = `${boundaryStart}${escapedAlias}${boundaryEnd}${negativeLookahead}`;
        const regex = new RegExp(regexPattern, "g");

        return prevText.replace(regex, (match) =>
          match.replace(alias, `[${alias}](${linkByAlias[alias]})`)
        );
      }, input);
};

const optionCallback = (
  blockUid: string,
  extensionAPI: OnloadArgs["extensionAPI"]
) => {
  const replace = getReplacer(extensionAPI);
  const blockContent = getTextByBlockUid(blockUid);
  if (!/^Aliases::/.test(blockContent)) {
    const newText = replace(blockContent);
    return window.roamAlphaAPI.updateBlock({
      block: {
        uid: blockUid,
        string: newText,
      },
    });
  }
  return Promise.resolve();
};

export const aliasBlock = ({
  blockUid,
  extensionAPI,
}: {
  blockUid: string;
  extensionAPI: OnloadArgs["extensionAPI"];
}) => optionCallback(blockUid, extensionAPI);

export const loadPageSynonyms = (extensionAPI: OnloadArgs["extensionAPI"]) => {
  const ALIAS_BLOCK_COMMAND = "Alias Page Synonyms (Alt-A)";
  window.roamAlphaAPI.ui.blockContextMenu.addCommand({
    label: ALIAS_BLOCK_COMMAND,
    callback: (props) => optionCallback(props["block-uid"], extensionAPI),
  });

  const multiOption = createMenuOption(async () => {
    const replace = getReplacer(extensionAPI);
    const highlightedDivIds = Array.from(
      document.getElementsByClassName("block-highlight-blue")
    ).map((d) => d.getElementsByClassName("roam-block")[0].id);
    highlightedDivIds.forEach(async (id: string) => {
      const { blockUid } = getUidsFromId(id);
      const blockContent = getTextByBlockUid(blockUid);
      const newText = replace(blockContent);
      window.roamAlphaAPI.updateBlock({
        block: {
          uid: blockUid,
          string: newText,
        },
      });
    });
  });

  const observer = createOverlayObserver(() => {
    const uls = document.getElementsByClassName("bp3-menu bp3-text-small");
    Array.from(uls)
      .filter((u) => !u.hasAttribute(ALIAS_PAGE_SYNONYM_ATTRIBUTE))
      .forEach((u) => {
        if (
          u.tagName === "UL" &&
          !u.getElementsByClassName(ALIAS_PAGE_SYNONYM_OPTION_CLASSNAME).length
        ) {
          const ul = u as HTMLUListElement;
          ul.setAttribute(ALIAS_PAGE_SYNONYM_ATTRIBUTE, "true");
          if (
            !ul.contains(multiOption) &&
            ul.innerText.includes("Copy block refs")
          ) {
            ul.appendChild(multiOption);
          }
        }
      });
  });

  const keydownListener = (e: KeyboardEvent) => {
    if (e.code === "KeyA" && e.altKey) {
      if (
        document.activeElement &&
        document.activeElement.tagName === "TEXTAREA"
      ) {
        optionCallback(
          getUids(document.activeElement as HTMLTextAreaElement).blockUid,
          extensionAPI
        );
        e.preventDefault();
      }
    }
  };
  document.addEventListener("keydown", keydownListener);

  return () => {
    window.roamAlphaAPI.ui.blockContextMenu.removeCommand({
      label: ALIAS_BLOCK_COMMAND,
    });
    document
      .querySelectorAll(`.${ALIAS_PAGE_SYNONYM_OPTION_CLASSNAME}`)
      .forEach((d) => d.remove());
    observer.disconnect();
    document.removeEventListener("keydown", keydownListener);
  };
};
