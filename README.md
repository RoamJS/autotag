# Auto Tag Mode

Automatically tag pages that exist in your graph!

When turned on, on block exit

1.  Links any exact match page references (full word, no partial matches)
2.  Aliases any case insensitive matches
3.  Creates links for natural language dates `friday` => `[[July 15th, 2022]]` (NOTE: Can be turned off in settings. Use carefully as this will change phrases like "today" and "now" to the daily note for today.)

`Alt + i` to turn on, or click the eye icon in the topbar.

**Exclusions:** Create an `[[autotag-exclude]]` page. Add pages you want to exclude (i.e., not be autotagged), in a comma-spaced list without `[[` `]]`, as the first block on that page.

[![image](https://github.com/RoamJS/autotag/assets/3792666/2c9b26d6-3c2c-4027-b595-663e9eec223e)](https://github.com/RoamJS/autotag/assets/3792666/d7d28f91-5214-48c3-94c4-9a675c6d3870)

## Page Synonyms

This extension adds a new option to block context menus that says "Alias Page Synonyms". Right click a block and click on the option to replace all text in the block with a reference to its defined alias. To define aliases, go to the page and add an `Aliases` attribute. All values should be comma delimited.

For example, to have `Tasks` and `task` alias back to `Task`, create an `Aliases` attribute on the `Task` page. The page should have a block that displays `Aliases:: Tasks, task`.

These aliases could be used in the main autotagging feature mentioned above. To enable, head to your Roam Depot settings and toggle on the setting titled `Process Alias`.

The extension also works for selecting multiple blocks. When you highlight and right click multiple selected blocks, the "Alias Page Synonyms" will appear and perform the same operation as described above.

By default, the extensions replace synonyms using the `[synonym](((page-uid)))` format. To use the tags format instead (`[synonym]([[Page Title]])`), head to your Roam Depot settings and enable the setting titled `Alias with Tags`.

[![image](https://github.com/RoamJS/autotag/assets/3792666/5637bca2-7c5d-49b0-b25e-1116f1211db5)](https://github.com/RoamJS/autotag/assets/3792666/5c2a4738-d6a8-484e-9470-14c7c960bd9f)

## Unlink Finder

This feature helps you find page references that haven’t been linked manually as opposed to automatically on each block exit as above. To enable, head to your Roam Depot settings for AutoTag and toggle on the setting titled `Unlink Finder`.

An X-shaped button will appear in the menu bar when this feature is activated. Clicking that button while on a page will highlight words on your screen matching each of these criteria:

![image](https://github.com/RoamJS/autotag/assets/3792666/f3da8818-5df5-4116-aabd-84e52f2123d4)

You could then right click on a link and choose between a `[[Reference Link]]` or an `[Alias Link]([[Alias Link]])`. Here are how the 5 match types work:

- Exact Match Type - These matches are case-sensitive, are a complete word, and are not already linked in a parent block.
- Fuzzy Match Type - These matches are case-insensitive, are a complete word, and not already linked in a parent block
- Partial Match Type - These matches are case-insensitive, only part of a word, and not already linked in a parent block.
- Redundant Match Type - These matches are case-insensitive, can be any part of a word, and are already linked in the parent block
- Alias Match Type - If you have any pages with an `Aliases::` attribute, those aliases will be shown in Roam blue. These also have a tooltip (as mentioned above) that show the actual page name. Make sure you have CSS suggested so these tooltips work.

## Demo

[![image](https://github.com/RoamJS/autotag/assets/3792666/ca441870-2425-42e1-8ae9-254769ed2934)](https://youtu.be/BtvAYlS3L14)
