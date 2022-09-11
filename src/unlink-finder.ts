const aliasWordMatchStyle = "rgba(125, 188, 255, 0.6)";
const exactWordMatchStyle = "rgba(71,151, 101, 0.4)";
const fuzzyWordMatchStyle = "rgba(220, 171, 121, 0.6)";
const partialWordMatchStyle = "rgba(229, 233, 236, 1.0)";
const redundantWordMatchStyle = "rgba(168, 42, 42, 0.4)";

function getAllPages() {
  return window.roamAlphaAPI
    .q("[:find ?t :where [?e :node/title ?t] ]")
    .map((t) => t[0] as string)
    .sort(function (a, b) {
      return b.length - a.length;
    });
}

function removeUnlinkSpans(el: Element) {
  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes[i] as HTMLElement;
    if (child.nodeType == 1 && child.classList.contains("unlink-finder")) {
      child.insertAdjacentText("afterend", child.innerText);
      child.remove();
    }
  }
  el.normalize();
}

function getAllAliases() {
  const aliasMap = new Map();

  // This function is handpicked from David Vargas' roam-client.
  // It is used to grab configuration from a Roam page.
  // You can find the whole library here: https://github.com/dvargas92495/roam-client
  var pagesWithAliases = window.roamAlphaAPI
    .q(
      `[:find (pull ?parentPage [*]) 
              :where [?referencedPage :node/title "Aliases"] 
                     [?referencingBlock :block/refs ?referencedPage]
                     [?parentPage :block/children ?referencingBlock]
             ]`
    )
    .map((p) => p[0] as { title: string; uid: string });
  var uidWithAliases = pagesWithAliases.map((p) => ({
    title: p.title,
    uid: p.uid,
    aliases:
      getConfigFromPage(p.title)
        ?.Aliases?.split(",")
        ?.map((a) => a.trim())
        ?.filter((a) => !!a) || [],
  }));

  for (let i = 0; i < uidWithAliases.length; i++) {
    try {
      for (let j = 0; j < uidWithAliases[i].aliases.length; j++) {
        aliasMap.set(
          uidWithAliases[i].aliases[j].trim(),
          uidWithAliases[i].title
        );
      }
    } catch (err) {
      continue;
    }
  }
  return aliasMap;
}

// This function is handpicked from David Vargas' roam-client.
// It is used to grab configuration from a Roam page.
// You can find the whole library here: https://github.com/dvargas92495/roam-client
const toAttributeValue = (s: string) =>
  (s.trim().startsWith("{{or: ")
    ? s.substring("{{or: ".length, s.indexOf("|"))
    : s
  ).trim();

// This function is handpicked from David Vargas' roam-client.
// It is used to grab configuration from a Roam page.
// You can find the whole library here: https://github.com/dvargas92495/roam-client
const getAttrConfigFromQuery = (query: string) => {
  const pageResults = window.roamAlphaAPI.q(query) as {
    attrs: [string, string, { source: [string, string] }][];
  }[][];
  if (pageResults.length === 0 || !pageResults[0][0].attrs) {
    return {};
  }

  const configurationAttrRefs = pageResults[0][0].attrs.map(
    (a) => a[2].source[1]
  );
  const entries = configurationAttrRefs.map(
    (r) =>
      ((
        window.roamAlphaAPI.q(
          `[:find (pull ?e [:block/string]) :where [?e :block/uid "${r}"] ]`
        )[0][0] as { string: string }
      ).string
        ?.split("::")
        .map(toAttributeValue) as [string, string]) ||
      ([r, "undefined"] as const)
  );
  return Object.fromEntries(entries);
};

// This function is handpicked from David Vargas' roam-client.
// It is used to grab configuration from a Roam page.
// You can find the whole library here: https://github.com/dvargas92495/roam-client
const getConfigFromPage = (inputPage: string) => {
  const page =
    inputPage ||
    document.getElementsByClassName("rm-title-display")[0]?.textContent;
  if (!page) {
    return {};
  }
  return getAttrConfigFromQuery(
    `[:find (pull ?e [*]) :where [?e :node/title "${page}"] ]`
  );
};

function pageTaggedInParent(node: Node, page: string) {
  let parent = node.parentElement;
  while (parent.classList.contains("roam-article") == false) {
    parent = parent.parentElement;
    if (parent.hasAttribute("data-page-links")) {
      const linkedPages = JSON.parse(parent.getAttribute("data-page-links"));
      if (linkedPages.includes(page)) {
        return true;
      }
    }
  }
  return false;
}

// For adding the highlights on page change
history.pushState = ((f) =>
  function pushState() {
    var ret = f.apply(this, arguments);
    window.dispatchEvent(new Event("pushstate"));
    window.dispatchEvent(new Event("locationchange"));
    return ret;
  })(history.pushState);
history.replaceState = ((f) =>
  function replaceState() {
    var ret = f.apply(this, arguments);
    window.dispatchEvent(new Event("replacestate"));
    window.dispatchEvent(new Event("locationchange"));
    return ret;
  })(history.replaceState);
window.addEventListener("popstate", () => {
  window.dispatchEvent(new Event("locationchange"));
});

function findTargetNodes(
  blocks: HTMLCollectionOf<Element>,
  pages: string[],
  aliases: Map<string, string>,
) {
  let matched = false;
  loop1: for (let i = 0; i < blocks.length; i++) {
    // all blocks only have 1 top level child node, a span.
    // skip to the second level of children
    for (let j = 0; j < blocks[i].childNodes[0].childNodes.length; j++) {
      const node = blocks[i].childNodes[0].childNodes[j];
      if (node.nodeType == 3) {
        // only text, no more childrens
        if (spanWrapper(node, pages, aliases, settings) == true) {
          matched = true;
          continue loop1;
        }
        continue;
      }
      if (node.nodeType == 1) {
        // element node type, need to dig deeper
        // these are already linked, skip
        const elementNode = node as Element;
        if (
          elementNode.hasAttribute("data-link-title") ||
          elementNode.hasAttribute("data-tag") ||
          elementNode.hasAttribute("recommend") ||
          elementNode.classList.contains("rm-attr-ref")
        ) {
          continue;
        }
        if (node.hasChildNodes()) {
          for (let k = 0; k < node.childNodes.length; k++) {
            if (node.childNodes[k].nodeType == 3) {
              // only text, no more childrens
              if (spanWrapper(node.childNodes[k], pages, aliases, settings)) {
                matched = true;
                continue loop1;
              }
              continue;
            }
            if (node.nodeType == 1) {
              // element node type, need to dig deeper
              // these are already linked, skip
              const elementNode = node.childNodes[k] as Element;
              if (
                elementNode.hasAttribute("data-link-title") ||
                elementNode.hasAttribute("data-tag") ||
                elementNode.hasAttribute("recommend")
              ) {
                continue;
              }
            }
          }
        }
      }
    }
  }
  return matched;
}

let settings = { minimumPageLength: 2, aliasCaseSensitive: false };

function runUnlinkFinder() {
  let matchFound = false;
  const unlinkFinderPages = getAllPages();
  const unlinkFinderAliases = getAllAliases();
  setTimeout(function () {
    do {
      let blocks = document.getElementsByClassName("roam-block");
      matchFound = findTargetNodes(
        blocks,
        unlinkFinderPages,
        unlinkFinderAliases,
      );
    } while (matchFound == true);
  }, 1000);
  addContextMenuListener();
}

const clearUnlinkFinder = () => {
  document.getElementById("unlink-finder-icon").setAttribute("status", "off");
  removeUnlinkFinderLegend();
  removeUnlinkTargets();
  document.removeEventListener("blur", runUnlinkFinder, true);
  window.removeEventListener("locationchange", runUnlinkFinder, true);
};

function unlinkFinder() {
  if (
    document.getElementById("unlink-finder-icon").getAttribute("status") ==
    "off"
  ) {
    document.getElementById("unlink-finder-icon").setAttribute("status", "on");
    addUnlinkFinderLegend();
    reAddUnlinkTargets();
    runUnlinkFinder();
    document.addEventListener("blur", runUnlinkFinder, true);
    window.addEventListener("locationchange", runUnlinkFinder, true);
  } else {
    clearUnlinkFinder();
  }
}

function spanWrapper(
  node: Node,
  pages: string[],
  aliases: Map<string, string>,
  {
    minimumPageLength,
    aliasCaseSensitive,
  }: { minimumPageLength: number; aliasCaseSensitive: boolean }
) {
  try {
    for (const [key, value] of aliases.entries()) {
      const flags = aliasCaseSensitive ? "" : "i";
      if (
        /^\w+$/.test(key)
          ? new RegExp(`(^|[^-])\\b${key}\\b($|[^-])`, flags).test(
              node.textContent
            )
          : new RegExp(key, flags).test(node.textContent)
      ) {
        // iterate over the childNodes and do stuff on childNodes that
        // don't have the data-link-title attribute
        const start = node.textContent.toLowerCase().indexOf(key.toLowerCase());
        const end = start + key.length;
        const beforeLinkText = node.textContent.slice(0, start);
        const linkText = node.textContent.slice(start, end);
        const afterLinkText = node.textContent.slice(end);
        // create span with page name
        var matchSpan = document.createElement("span");
        matchSpan.classList.add("unlink-finder");
        matchSpan.setAttribute("data-text", value);
        matchSpan.style.cssText += `position: relative; background: ${aliasWordMatchStyle}`;
        matchSpan.classList.add("alias-word-match");
        matchSpan.setAttribute("recommend", "underline");
        matchSpan.innerText = linkText;
        // truncate existing text node
        node.textContent = beforeLinkText;
        // add that span after the text node
        node.parentNode.insertBefore(matchSpan, node.nextSibling);
        // create a text node with the remainder text
        const remainderText = document.createTextNode(afterLinkText);
        // add that remainder text after inserted node
        node.parentNode.insertBefore(
          remainderText,
          node.nextSibling.nextSibling
        );
        return true;
      }
    }
    for (let l = 0; l < pages.length; l++) {
      if (pages[l].length < minimumPageLength) {
        continue;
      }
      if (node.textContent.toLowerCase().includes(pages[l].toLowerCase())) {
        // iterate over the childNodes and do stuff on childNodes that
        // don't have the data-link-title attribute
        const start = node.textContent
          .toLowerCase()
          .indexOf(pages[l].toLowerCase());
        const end = start + pages[l].length;
        const beforeLinkText = node.textContent.slice(0, start);
        const firstCharBeforeMatch = node.textContent.slice(start - 1)[0];
        const firstCharAfterMatch = node.textContent
          .slice(start)
          .substr(pages[l].length)[0];
        const linkText = node.textContent.slice(start, end);
        const afterLinkText = node.textContent.slice(end);
        // create span with page name
        const matchSpan = document.createElement("span");
        matchSpan.classList.add("unlink-finder");
        matchSpan.style.cssText += `background: ${exactWordMatchStyle}`;
        matchSpan.classList.add("exact-word-match");
        matchSpan.setAttribute("recommend", "underline");
        matchSpan.setAttribute("data-text", pages[l]);
        if (linkText != pages[l]) {
          matchSpan.classList.add("fuzzy-word-match");
          matchSpan.classList.remove("exact-word-match");
          matchSpan.style.cssText += `position:relative; background: ${fuzzyWordMatchStyle}`;
        }
        if (
          (![
            ".",
            " ",
            ",",
            "!",
            "?",
            "_",
            "/",
            ":",
            ";",
            "'",
            '"',
            "@",
            ")",
            "(",
            "{",
            "}",
            "[",
            "]",
            "^",
            "*",
            "#",
          ].includes(firstCharAfterMatch) &&
            end != node.textContent.length) ||
          (![
            ".",
            " ",
            ",",
            "!",
            "?",
            "_",
            "/",
            ":",
            ";",
            "'",
            '"',
            "@",
            ")",
            "(",
            "{",
            "}",
            "[",
            "]",
            "^",
            "*",
            "#",
          ].includes(firstCharBeforeMatch) &&
            start != 0)
        ) {
          matchSpan.classList.add("partial-word-match");
          matchSpan.classList.remove("exact-word-match");
          matchSpan.style.cssText += `background: ${partialWordMatchStyle}`;
        }
        if (pageTaggedInParent(node, pages[l]) == true) {
          matchSpan.classList.add("redundant-word-match");
          matchSpan.classList.remove("exact-word-match");
          matchSpan.style.cssText += `background: ${redundantWordMatchStyle}`;
        }
        matchSpan.innerText = linkText;
        // truncate existing text node
        node.textContent = beforeLinkText;
        // add that span after the text node
        node.parentNode.insertBefore(matchSpan, node.nextSibling);
        // create a text node with the remainder text
        const remainderText = document.createTextNode(afterLinkText);
        // add that remainder text after inserted node
        node.parentNode.insertBefore(
          remainderText,
          node.nextSibling.nextSibling
        );
        return true;
      }
    }
  } catch (err) {
    return false;
  }
}

function removeUnlinkTargets() {
  const targetNodes = document.getElementsByClassName(
    "unlink-finder"
  ) as HTMLCollectionOf<HTMLElement>;
  for (let i = 0; i < targetNodes.length; i++) {
    if (targetNodes[i].classList.contains("unlink-finder-legend")) {
      continue;
    }
    if (targetNodes[i].classList.contains("exact-word-match")) {
      targetNodes[i].classList.remove("exact-word-match");
      targetNodes[i].classList.add("exact-word-match-inactive");
      targetNodes[i].style.cssText = "";
    }
    if (targetNodes[i].classList.contains("fuzzy-word-match")) {
      targetNodes[i].classList.remove("fuzzy-word-match");
      targetNodes[i].classList.add("fuzzy-word-match-inactive");
      targetNodes[i].style.cssText = "";
    }
    if (targetNodes[i].classList.contains("partial-word-match")) {
      targetNodes[i].classList.remove("partial-word-match");
      targetNodes[i].classList.add("partial-word-match-inactive");
      targetNodes[i].style.cssText = "";
    }
    if (targetNodes[i].classList.contains("redundant-word-match")) {
      targetNodes[i].classList.remove("redundant-word-match");
      targetNodes[i].classList.add("redundant-word-match-inactive");
      targetNodes[i].style.cssText = "";
    }
    if (targetNodes[i].classList.contains("alias-word-match")) {
      targetNodes[i].classList.remove("alias-word-match");
      targetNodes[i].classList.add("alias-word-match-inactive");
      targetNodes[i].style.cssText = "";
    }
  }
}

function reAddUnlinkTargets() {
  const targetNodes = document.getElementsByClassName(
    "unlink-finder"
  ) as HTMLCollectionOf<HTMLElement>;
  for (let i = 0; i < targetNodes.length; i++) {
    if (targetNodes[i].classList.contains("unlink-finder-legend")) {
      continue;
    }
    if (targetNodes[i].classList.contains("exact-word-match-inactive")) {
      targetNodes[i].classList.remove("exact-word-match-inactive");
      targetNodes[i].classList.add("exact-word-match");
      targetNodes[i].style.cssText = `background: ${exactWordMatchStyle}`;
    }
    if (targetNodes[i].classList.contains("fuzzy-word-match-inactive")) {
      targetNodes[i].classList.remove("fuzzy-word-match-inactive");
      targetNodes[i].classList.add("fuzzy-word-match");
      targetNodes[
        i
      ].style.cssText = `position:relative; background: ${fuzzyWordMatchStyle}`;
    }
    if (targetNodes[i].classList.contains("partial-word-match-inactive")) {
      targetNodes[i].classList.remove("partial-word-match-inactive");
      targetNodes[i].classList.add("partial-word-match");
      targetNodes[i].style.cssText = `background: ${partialWordMatchStyle}`;
    }
    if (targetNodes[i].classList.contains("redundant-word-match-inactive")) {
      targetNodes[i].classList.remove("redundant-word-match-inactive");
      targetNodes[i].classList.add("redundant-word-match");
      targetNodes[i].style.cssText = `background: ${redundantWordMatchStyle}`;
    }
    if (targetNodes[i].classList.contains("alias-word-match-inactive")) {
      targetNodes[i].classList.remove("alias-word-match-inactive");
      targetNodes[i].classList.add("alias-word-match");
      targetNodes[
        i
      ].style.cssText = `position: relative; background: ${aliasWordMatchStyle}`;
    }
  }
}

let unlinkFinderElementToLink: HTMLElement = null;
let unlinkFinderBackdrop: HTMLElement = null;
let unlinkFinderMenu: HTMLElement = null;
let unlinkFinderMenuOptions: HTMLElement[] = null;
let unlinkFinderMenuVisible = false;

const toggleMenu = (command: "show" | "hide") => {
  unlinkFinderMenu.style.display = command === "show" ? "block" : "none";
  unlinkFinderBackdrop.style.display = command === "show" ? "block" : "none";
  unlinkFinderMenuVisible = command == "show";
};

const setPosition = ({ top, left }: { top: number; left: number }) => {
  unlinkFinderMenu.style.left = `${left}px`;
  unlinkFinderMenu.style.top = `${top}px`;
  toggleMenu("show");
};

function addContextMenuListener() {
  var unlinkFinderMatches = document.querySelectorAll(".unlink-finder");
  for (var i = 0, len = unlinkFinderMatches.length; i < len; i++) {
    var match = unlinkFinderMatches[i];
    match.addEventListener("contextmenu", function (e: MouseEvent) {
      e.preventDefault();
      const origin = {
        left: e.pageX,
        top: e.pageY,
      };
      setPosition(origin);
      unlinkFinderElementToLink = e.target as HTMLElement;
      return false;
    });
  }
}

function setupUnlinkFinderContextMenu() {
  for (var i = 0; i < unlinkFinderMenuOptions.length; i++) {
    unlinkFinderMenuOptions[i].addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.innerHTML == "Link using [[Reference]]") {
        linkUsingReference(unlinkFinderElementToLink);
      }
      if (target.innerHTML == "Link using [Alias]([[Reference]])") {
        linkUsingAlias(unlinkFinderElementToLink);
      }
    });
  }
}

function countOfPreviousMatches(_el: HTMLElement) {
  let el = _el;
  let matchedWord = el.innerText;
  let count = 1;
  while (el.previousSibling != null) {
    if (el.previousSibling.textContent.includes(matchedWord)) {
      count += 1;
    }
    el = el.previousSibling as HTMLElement;
  }
  return count;
}

function replaceMatchedWord(
  count: number,
  text: string,
  matchedWord: string,
  futureWord: string
) {
  var t = 0;
  var re = new RegExp(matchedWord, "g");
  return text.replace(re, function (match) {
    t++;
    return t === count ? futureWord : match;
  });
}

// TODO: get the right matched item if there are many matches of the same element in the block
function linkUsingReference(el: HTMLElement) {
  let actualPageName = el.getAttribute("data-text");
  let matchedWord = el.innerText;
  let futureWord = "[[" + actualPageName + "]]";
  const locationOfMatchedWord = countOfPreviousMatches(el);
  const blockUid = (el.parentNode.parentNode as HTMLElement).id.slice(-9);
  let currentText =
    (
      window.roamAlphaAPI.q(
        `[:find (pull ?e [:block/string]) :where [?e :block/uid "${blockUid}"]]`
      )?.[0]?.[0] as { string: string }
    )?.string || "";
  let futureText = replaceMatchedWord(
    locationOfMatchedWord,
    currentText,
    matchedWord,
    futureWord
  );
  removeUnlinkSpans(el.parentNode as Element);
  window.roamAlphaAPI.updateBlock({
    block: { uid: blockUid, string: futureText },
  });
}

function linkUsingAlias(el: HTMLElement) {
  let actualPageName = el.getAttribute("data-text");
  let matchedWord = el.innerText;
  let futureWord = "[" + matchedWord + "]([[" + actualPageName + "]])";
  const locationOfMatchedWord = countOfPreviousMatches(el);
  const blockUid = (el.parentNode.parentNode as HTMLElement).id.slice(-9);
  let currentText = (
    window.roamAlphaAPI.q(
      `[:find (pull ?e [:block/string]) :where [?e :block/uid "${blockUid}"]]`
    )[0][0] as { string: string }
  ).string;
  let futureText = replaceMatchedWord(
    locationOfMatchedWord,
    currentText,
    matchedWord,
    futureWord
  );
  removeUnlinkSpans(el.parentNode as Element);
  window.roamAlphaAPI.updateBlock({
    block: { uid: blockUid, string: futureText },
  });
}

function createCustomContextMenu() {
  var portalDiv = document.createElement("div");
  portalDiv.classList.add("bp3-portal");
  portalDiv.id = "unlink-custom-context-menu";
  var overlayDiv = document.createElement("div");
  overlayDiv.classList.add("bp3-overlay");
  overlayDiv.classList.add("bp3-overlay-open");
  var backdropDiv = document.createElement("div");
  backdropDiv.classList.add("bp3-overlay-backdrop");
  backdropDiv.classList.add("bp3-popover-backdrop");
  backdropDiv.classList.add("bp3-popover-appear-done");
  backdropDiv.classList.add("bp3-popover-enter-done");
  backdropDiv.classList.add("unlink-finder-context-backdrop");
  backdropDiv.style.cssText = `display: none;`;
  var containerDiv = document.createElement("div");
  containerDiv.classList.add("bp3-transition-container");
  containerDiv.classList.add("bp3-popover-appear-done");
  containerDiv.classList.add("bp3-popover-enter-done");
  containerDiv.classList.add("unlink-finder-context-menu");
  containerDiv.style.cssText = `display: none; width: auto; position: fixed;`;
  var popoverDiv = document.createElement("div");
  popoverDiv.classList.add("bp3-popover");
  popoverDiv.classList.add("bp3-minimal");
  var popoverContentDiv = document.createElement("div");
  popoverContentDiv.classList.add("bp3-popover-content");
  var blankDiv = document.createElement("div");
  var menuDiv = document.createElement("ul");
  menuDiv.classList.add("bp3-text-small");
  menuDiv.classList.add("bp3-menu");
  var referenceLink = document.createElement("li");
  referenceLink.classList.add("unlink-finder-context-menu-option");
  var referenceLinkAction = document.createElement("a");
  referenceLinkAction.classList.add("bp3-menu-item");
  referenceLinkAction.classList.add("bp3-popover-dismiss");
  var referenceLinkText = document.createElement("div");
  referenceLinkText.classList.add("bp3-text-overflow-ellipsis");
  referenceLinkText.classList.add("bp3-fill");
  referenceLinkText.innerText = "Link using [[Reference]]";

  var aliasLink = document.createElement("li");
  aliasLink.classList.add("unlink-finder-context-menu-option");
  var aliasLinkAction = document.createElement("a");
  aliasLinkAction.classList.add("bp3-menu-item");
  aliasLinkAction.classList.add("bp3-popover-dismiss");
  var aliasLinkText = document.createElement("div");
  aliasLinkText.classList.add("bp3-text-overflow-ellipsis");
  aliasLinkText.classList.add("bp3-fill");
  aliasLinkText.innerText = "Link using [Alias]([[Reference]])";

  aliasLinkAction.appendChild(aliasLinkText);
  aliasLink.appendChild(aliasLinkAction);
  referenceLinkAction.appendChild(referenceLinkText);
  referenceLink.appendChild(referenceLinkAction);
  menuDiv.appendChild(referenceLink);
  menuDiv.appendChild(aliasLink);
  blankDiv.appendChild(menuDiv);
  popoverContentDiv.appendChild(blankDiv);
  popoverDiv.appendChild(popoverContentDiv);
  containerDiv.appendChild(popoverDiv);
  overlayDiv.appendChild(backdropDiv);
  overlayDiv.appendChild(containerDiv);
  portalDiv.appendChild(overlayDiv);

  document.getElementById("app").appendChild(portalDiv);
}

function removeUnlinkFinderLegend() {
  document.getElementById("unlink-finder-legend").remove();
}

function createUnlinkFinderLegendElement(
  matchType: string,
  matchStyle: string,
  matchText: string
) {
  var matchSpan = document.createElement("span");
  matchSpan.classList.add("unlink-finder-legend");
  matchSpan.classList.add("unlink-finder");
  matchSpan.classList.add(matchType);
  matchSpan.innerText = matchText;
  matchSpan.setAttribute("data-text", "Actual Page Name");
  matchSpan.style.cssText = `margin-right: 4px; position:relative; background: ${matchStyle}`;
  return matchSpan;
}

function addUnlinkFinderLegend() {
  if (document.getElementById("unlink-finder-legend") == null) {
    var unlinkFinderLegend = document.createElement("div");
    unlinkFinderLegend.classList.add("unlink-finder-legend");
    unlinkFinderLegend.id = "unlink-finder-legend";
    unlinkFinderLegend.setAttribute("style", "margin-left: 4px;");
    unlinkFinderLegend.style.cssText = "border-style: groove;";
    var legendKey = document.createElement("span");
    legendKey.classList.add("unlink-finder-legend");
    legendKey.classList.add("unlink-finder");
    legendKey.innerText = "Match Types: ";
    legendKey.style.cssText = "margin-left: 4px; margin-right: 4px;";
    var aliasWordMatch = createUnlinkFinderLegendElement(
      "alias-word-match",
      aliasWordMatchStyle,
      "Alias"
    );
    var exactWordMatch = createUnlinkFinderLegendElement(
      "exact-word-match",
      exactWordMatchStyle,
      "Exact"
    );
    var fuzzyWordMatch = createUnlinkFinderLegendElement(
      "fuzzy-word-match",
      fuzzyWordMatchStyle,
      "Fuzzy"
    );
    var partialWordMatch = createUnlinkFinderLegendElement(
      "partial-word-match",
      partialWordMatchStyle,
      "Partial"
    );
    var redundantWordMatch = createUnlinkFinderLegendElement(
      "redundant-word-match",
      redundantWordMatchStyle,
      "Redundant"
    );
    unlinkFinderLegend.appendChild(legendKey);
    unlinkFinderLegend.appendChild(aliasWordMatch);
    unlinkFinderLegend.appendChild(exactWordMatch);
    unlinkFinderLegend.appendChild(fuzzyWordMatch);
    unlinkFinderLegend.appendChild(partialWordMatch);
    unlinkFinderLegend.appendChild(redundantWordMatch);
    var roamTopbar = document.getElementsByClassName("rm-topbar");
    roamTopbar[0].insertBefore(unlinkFinderLegend, roamTopbar[0].childNodes[2]);
  }
}

function unlinkFinderButton() {
  var unlinkFinderButton = document.createElement("span");
  unlinkFinderButton.classList.add("bp3-popover-wrapper");
  unlinkFinderButton.setAttribute("style", "margin-left: 4px;");
  var spanTwo = document.createElement("span");
  spanTwo.classList.add("bp3-popover-target");
  unlinkFinderButton.appendChild(spanTwo);
  var unlinkFinderIcon = document.createElement("span");
  unlinkFinderIcon.id = "unlink-finder-icon";
  unlinkFinderIcon.setAttribute("status", "off");
  unlinkFinderIcon.classList.add(
    "bp3-icon-search-around",
    "bp3-button",
    "bp3-minimal",
    "bp3-small"
  );
  spanTwo.appendChild(unlinkFinderIcon);
  var roamTopbar = document.getElementsByClassName("rm-topbar");
  roamTopbar[0].appendChild(unlinkFinderButton);
  unlinkFinderIcon.onclick = unlinkFinder;
}

const clickListener = () => {
  if (unlinkFinderMenuVisible) {
    toggleMenu("hide");
  }
};

export const initializeUnlinkFinder = (initSettings: Partial<typeof settings>) => {
  if (document.getElementById("unlink-finder-icon") == null) {
    settings = {
      ...settings,
      ...initSettings,
    }
    unlinkFinderButton();
    createCustomContextMenu();
    unlinkFinderBackdrop = document.querySelector(
      ".unlink-finder-context-backdrop"
    );
    unlinkFinderMenu = document.querySelector(".unlink-finder-context-menu");
    unlinkFinderMenuOptions = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".unlink-finder-context-menu-option"
      )
    );
    document.addEventListener("click", clickListener);
    setupUnlinkFinderContextMenu();
  }
};

export const shutdownUnlinkFinder = () => {
  shutdownUnlinkFinder();
  document.getElementById("unlink-finder-icon")?.remove();
  document.getElementById("unlink-custom-context-menu")?.remove();
  document.removeEventListener("click", clickListener);
};
