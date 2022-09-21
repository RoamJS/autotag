Automatically tag pages that exist in your graph!

When turned on, on block exit

 1. Links any exact match page references (full word, no partial matches)
 2. Aliases any case insensitive matches
 3. Creates links for natural language dates `friday` => `[[July 15th, 2022]]` (NOTE: Can be turned off in settings. Use carefully as this will change phrases like "today" and "now" to the daily note for today.)

`Alt + i` to turn on, or click the eye icon in the topbar.

**Exclusions:** Create an [[autotag-exclude]] page. Add pages you want to exclude (i.e., not be autotagged), in a comma-spaced list without [[ ]], as the first block on that page.

<video src="https://user-images.githubusercontent.com/23647837/178828948-b0408651-de33-4118-bfd3-0dfdfd1723fe.mp4" controls="controls"></video>

### Page Synonyms

This extension adds a new option to block context menus that says "Alias Page Synonyms". Right click a block and click on the option to replace all text in the block with a reference to its defined alias. To define aliases, go to the page and add an `Aliases` attribute. All values should be comma delimited.

For example, to have `Tasks` and `task` alias back to `Task`, create an `Aliases` attribute on the `Task` page. The page should have a block that displays `Aliases:: Tasks, task`.

These aliases could be used in the main autotagging feature mentioned above. To enable, head to your Roam Depot settings and toggle on the setting titled `Process Alias`.

The extension also works for selecting multiple blocks. When you highlight and right click multiple selected blocks, the "Alias Page Synonyms" will appear and perform the same operation as described above.

By default, the extensions replace synonyms using the `[synonym](((page-uid)))` format. To use the tags format instead (`[synonym]([[Page Title]])`), head to your Roam Depot settings and enable the setting titled `Alias with Tags`.

![](https://firebasestorage.googleapis.com/v0/b/firescript-577a2.appspot.com/o/imgs%2Fapp%2Froamjs%2FWtnc8A2U3x.mp4)

### Unlink Finder

This feature helps you find page references that haven’t been linked manually as opposed to automatically on each block exit as above. To enable, head to your Roam Depot settings for AutoTag and toggle on the setting titled `Unlink Finder`.

An X-shaped button will appear in the menu bar when this feature is activated. Clicking that button while on a page will highlight words on your screen matching each of these criteria:

![](https://firebasestorage.googleapis.com/v0/b/firescript-577a2.appspot.com/o/imgs%2Fapp%2Ftylerwince-public%2FxyvnsSa9mH.png?alt=media&token=f916b1c4-142e-4bb8-915a-b71f2bb35613)

You could then right click on a link and choose between a `[[Reference Link]]` or an `[Alias Link]([[Alias Link]])`. Here are how the 5 match types work:
- Exact Match Type - These matches are case-sensitive, are a complete word, and are not already linked in a parent block.
- Fuzzy Match Type - These matches are case-insensitive, are a complete word, and not already linked in a parent block
- Partial Match Type - These matches are case-insensitive, only part of a word, and not already linked in a parent block.
- Redundant Match Type - These matches are case-insensitive, can be any part of a word, and are already linked in the parent block
- Alias Match Type - If you have any pages with an `Aliases::` attribute, those aliases will be shown in Roam blue. These also have a tooltip (as mentioned above) that show the actual page name. Make sure you have CSS suggested so these tooltips work. 

[Demo Video on YouTube](https://youtu.be/BtvAYlS3L14)
