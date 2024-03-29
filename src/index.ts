/* ======= AUTOTAG MODE  v0.4.1========
 * Pre-requisites -
 * For NLP dates: Roam42 https://roamjs.com/extensions/roam42
 * For PageSynonyms: Page Synonyms https://roamjs.com/extensions/page-synonyms
 * Hat-tips: Azlen for arrive.js idea; Tyler Wince for Unlink Finder; Chris TftHacker for Roam42; Murf for demystifying JS and refactoring the regex; David Vargas for everything!
 */
// Exclusions: Create an [[autotag-exclude]] page. Add pages you want to exclude, comma-spaced without [[ ]], to the first block on that page
// Change line 134 to change the keyboard shortcut to toggle on and off (default is alt+i)

import "arrive";
import type { OnloadArgs } from "roamjs-components/types";
import parseTextForDates from "./dateProcessing";
import { aliasBlock, loadPageSynonyms } from "./page-synonyms";
import { initializeUnlinkFinder, shutdownUnlinkFinder } from "./unlink-finder";

/* ======= CODE ========  */

let blockUid = "initial",
  attoggle = !0;

function autotag() {
  (attoggle = !attoggle)
    ? ((blockUid = "initial"),
      document
        .getElementById("autotag-icon")
        .classList.replace("bp3-icon-eye-on", "bp3-icon-eye-off"))
    : document
        .getElementById("autotag-icon")
        .classList.replace("bp3-icon-eye-off", "bp3-icon-eye-on");
}

function getAllExcludes() {
  return (
    window.roamAlphaAPI.q(
      '[ :find (pull ?e [* {:block/children [*]}]) :where [?e :node/title "autotag-exclude"]]'
    )[0][0] as { children: { string: string }[] }
  ).children[0].string
    .split(",")
    .map((e) => e.trim());
}

function getAllPages() {
  return window.roamAlphaAPI
    .q("[:find ?t :where [?e :node/title ?t] ]")
    .map((e) => e[0] as string)
    .sort(function (e, t) {
      return t.length - e.length;
    });
}

function blockUpdate(e: string, t: string) {
  return window.roamAlphaAPI.updateBlock({
    block: {
      uid: e,
      string: t,
    },
  });
}

function keydown(e: KeyboardEvent) {
  if (e.altKey && 73 === e.keyCode) {
    if ((attoggle = !attoggle))
      (blockUid = "initial"),
        document
          .getElementById("autotag-icon")
          .classList.replace("bp3-icon-eye-on", "bp3-icon-eye-off");
    else {
      let e = window.roamAlphaAPI.ui.getFocusedBlock();
      null !== e && (blockUid = e["block-uid"]),
        document
          .getElementById("autotag-icon")
          .classList.replace("bp3-icon-eye-off", "bp3-icon-eye-on");
    }
  }
}

function textareaArrive() {
  attoggle ||
    (blockUid = window.roamAlphaAPI.ui.getFocusedBlock()["block-uid"]);
}

const nameToUse = "autotag";
const mainButtonId = nameToUse + "-button";

function setSettingDefault(
  extensionAPI: OnloadArgs["extensionAPI"],
  settingId: string,
  settingDefault: string | number | boolean
) {
  let storedSetting = extensionAPI.settings.get(settingId);
  if (null == storedSetting)
    extensionAPI.settings.set(settingId, settingDefault);
  return storedSetting || settingDefault;
}

const friday = new Date();
friday.setDate(friday.getDate() - friday.getDay() + 5);

function onload({ extensionAPI }: OnloadArgs) {
  setSettingDefault(extensionAPI, "caseinsensitive", true);
  setSettingDefault(extensionAPI, "processreferences", true);
  const initProcessDates = setSettingDefault(
    extensionAPI,
    "processdates",
    true
  );
  setSettingDefault(extensionAPI, "processalias", false);
  setSettingDefault(extensionAPI, "minpagelength", 2);
  setSettingDefault(extensionAPI, "use-tags", true);
  const initUnlinkFinder = setSettingDefault(
    extensionAPI,
    "unlink-finder",
    false
  );
  extensionAPI.settings.panel.create({
    tabTitle: "Auto Tag",
    settings: [
      {
        id: "caseinsensitive",
        name: "Case Insensitive",
        description:
          "Tags references regardless of casing, otherwise it will alias, e.g., [book]([[Book]])",
        action: {
          type: "switch",
        },
      },
      {
        id: "processreferences",
        name: "Autolink References",
        description: "Automatically link unlinked references during autotag",
        action: { type: "switch" },
      },
      {
        id: "processdates",
        name: "Natural Language dates",
        description: `Allow date nlp resolution within semicolons, e.g. ";friday;" turns into [[${window.roamAlphaAPI.util.dateToPageTitle(
          friday
        )}]]`,
        action: {
          type: "switch",
          onChange: (e) =>
            e.target.checked
              ? document.addEventListener("keyup", dateTagListener)
              : document.removeEventListener("keyup", dateTagListener),
        },
      },
      {
        id: "processalias",
        name: "Process Alias",
        description:
          "Whether or not to process Page Synonyms defined by Aliases:: attributes",
        action: { type: "switch" },
      },
      {
        id: "minpagelength",
        name: "Minimum Page Length",
        description:
          'If set to 2, "of" will not be tagged, but "the" will be tagged (if those pages exist in your graph)',
        action: {
          type: "select",
          items: Array(30)
            .fill(null)
            .map((_, s) => s.toString()),
        },
      },
      {
        id: "use-tags",
        name: "Alias with Tags",
        description:
          "Whether or not to process page aliases using tag syntax: [alias]([[Page Name]])",
        action: { type: "switch" },
      },
      {
        id: "unlink-finder",
        name: "Unlink Finder",
        description:
          "Whether or not to initialize the unlink finder feature for manual tagging of unlinked references",
        action: {
          type: "switch",
          onChange: (e) =>
            e.target.checked
              ? initializeUnlinkFinder()
              : shutdownUnlinkFinder(),
        },
      },
    ],
  });

  window.addEventListener("keydown", keydown);

  function blockAlias(e: string) {
    if (!extensionAPI.settings.get("processalias")) return e;
    aliasBlock({
      blockUid: e,
      extensionAPI,
    });
  }

  function linkReferences(blockText: string) {
    const caseInsensitive = extensionAPI.settings.get("caseinsensitive");
    const minPageLength = extensionAPI.settings.get("minpagelength") as number;
    if (!blockText) return undefined;
    if (!extensionAPI.settings.get("processreferences")) return blockText;
    let allPages = getAllPages(),
      excludedTitles = [] as string[];
    0 !==
      window.roamAlphaAPI.q(
        '[:find (pull ?e [*]) :where [?e :node/title "autotag-exclude"] ]'
      ).length && (excludedTitles = getAllExcludes());
    let filteredPages = allPages.filter((page) => {
      let escapedPageTitle = page.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      if (excludedTitles.includes(page) || page.length <= minPageLength)
        return !1;
      let regexPattern = new RegExp(escapedPageTitle, "i");
      return (
        !!blockText.match(regexPattern) &&
        ((regexPattern = new RegExp(
          `\\[\\[${escapedPageTitle}\\]\\]|#\\b${escapedPageTitle}\\b`
        )),
        !blockText.match(regexPattern))
      );
    });
    filteredPages = filteredPages.sort((e, t) => t.length - e.length);
    let regexSpecialCharacters = new RegExp(
        "(\\[[^\\]]+\\]\\([^ ]+\\)|{{[^}]+}}|\\S*::|\\[\\[[^\\]]+\\]\\]|\\[[^\\]]+\\]|\\[[^\\]]+$|https?://[^\\s]+|www\\.[^\\s]+)",
        "g"
      ),
      modifiedText = blockText,
      linkedPages = [] as string[];
    return (
      filteredPages.forEach((e) => {
        let t = e.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"),
          splitText = modifiedText.split(regexSpecialCharacters),
          newText = "";
        splitText.forEach((text) => {
          let processedText = text;
          if (!text.match(regexSpecialCharacters) && !linkedPages.includes(e)) {
            let l = new RegExp(`^\\b${t}\\b|[^\\[]\\b${t}\\b`, "i");
            if (processedText.match(l)) {
              let n = processedText.length;
              (l = new RegExp(`(^|[^\\[])\\b(${t})\\b`)),
                processedText.match(l)
                  ? (processedText = processedText.replace(l, "$1[[$2]]"))
                  : caseInsensitive &&
                    ((l = new RegExp(`(^|[^\\[])\\b(${t})\\b`, "i")),
                    (processedText = processedText.replace(
                      l,
                      `$1[$2]([[${e}]])`
                    ))),
                processedText.length !== n && linkedPages.push(e);
            }
          }
          newText += processedText;
        }),
          (modifiedText = newText);
      }),
      modifiedText
    );
  }

  function textareaLeave() {
    if (!attoggle) {
      const blockUidLeft = blockUid;
      const blockText = window.roamAlphaAPI.pull("[:block/string]", [
        ":block/uid",
        blockUidLeft,
      ])?.[":block/string"];
      if (!blockText) return;
      const processedBlockText = linkReferences(blockText);
      blockUpdate(blockUidLeft, processedBlockText).then(() =>
        blockAlias(blockUidLeft)
      );
    }
  }

  // @ts-ignore arrive.js
  document.leave("textarea.rm-block-input", textareaLeave),
    // @ts-ignore arrive.js
    document.arrive("textarea.rm-block-input", textareaArrive);

  var bpIconName = "eye-off",
    checkForButton = document.getElementById(nameToUse + "-icon");

  if (!checkForButton) {
    var mainButton = document.createElement("span");
    (mainButton.id = mainButtonId),
      mainButton.classList.add("bp3-popover-wrapper");
    var spanTwo = document.createElement("span");
    spanTwo.classList.add("bp3-popover-target");
    mainButton.appendChild(spanTwo);
    var mainIcon = document.createElement("span");
    (mainIcon.id = nameToUse + "-icon"),
      mainIcon.classList.add(
        "bp3-icon-" + bpIconName,
        "bp3-button",
        "bp3-minimal",
        "bp3-small"
      ),
      spanTwo.appendChild(mainIcon);
    var roamTopbar = document.getElementsByClassName("rm-topbar"),
      nextIconButton = roamTopbar[0].lastElementChild,
      flexDiv = document.createElement("div");
    (flexDiv.id = nameToUse + "-flex-space"),
      (flexDiv.className = "rm-topbar__spacer-sm"),
      nextIconButton.insertAdjacentElement("afterend", mainButton),
      mainButton.insertAdjacentElement("afterend", flexDiv),
      mainButton.addEventListener("click", autotag);
  }

  // if (attoggle) autotag();
  const unloadPageSynonyms = loadPageSynonyms(extensionAPI);
  if (initUnlinkFinder)
    initializeUnlinkFinder({
      minimumPageLength:
        (extensionAPI.settings.get("minpagelength") as number) || 2,
      aliasCaseSensitive:
        (extensionAPI.settings.get("caseinsensitive") as boolean) || false,
    });
  const dateTagListener = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (
      (e.key === ";" || e.code === "Semicolon") &&
      target.tagName === "TEXTAREA" &&
      target.classList.contains("rm-block-input")
    ) {
      const { selectionStart, id, value } = target as HTMLTextAreaElement;
      const location = window.roamAlphaAPI.ui.getFocusedBlock();
      const textToCursor = value.substring(0, selectionStart);
      if (/;[^;]+;$/.test(textToCursor)) {
        const match = /;[^;]+;$/.exec(textToCursor);
        const replace = match[0].slice(1, -1);
        const replaced = parseTextForDates(replace);
        if (replaced && replaced !== replace) {
          blockUpdate(
            location["block-uid"],
            `${value.slice(0, match.index)}${replaced}${value.slice(
              selectionStart
            )}`
          ).then(() => {
            window.roamAlphaAPI.ui.setBlockFocusAndSelection({
              location,
              selection: {
                start: selectionStart - replace.length - 2 + replaced.length,
              },
            });
          });
        }
      }
    }
  };
  if (initProcessDates) document.addEventListener("keyup", dateTagListener);
  return function onunload() {
    unloadPageSynonyms();
    shutdownUnlinkFinder();
    window.removeEventListener("keydown", keydown);

    // @ts-ignore arrive.js
    document.unbindLeave(textareaLeave);
    // @ts-ignore arrive.js
    document.unbindArrive(textareaArrive);

    let button = document.getElementById(mainButtonId);
    if (button) button.remove();

    let flexDiv = document.getElementById(nameToUse + "-flex-space");
    if (flexDiv) flexDiv.remove();
    document.removeEventListener("keyup", dateTagListener);
  };
}

export default {
  onload: onload,
};
