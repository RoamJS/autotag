import * as chrono from "chrono-node";

const parseTextForDates = (str: string, reference_date?: Date) => {
  const str_with_pages_removed = str.replace(/\[+\[[^)]+\]+\] */g, "");
  const date =  chrono.parse(str_with_pages_removed, reference_date);
  // support parsing to return parse results
  // also solve the `of` bug
  // parseNlpDate(str_with_pages_removed, reference_date);

  if (date.length) {
    return date.reduce((prev, { text, index, start }) => {
      const roamDate = `[${text}]([[${window.roamAlphaAPI.util.dateToPageTitle(
        start.date()
      )}]])`;
      return `${prev.slice(0, index)}${roamDate}${prev.slice(
        index + text.length
      )}`;
    }, str);
  } else {
    return str;
  }
};

export default parseTextForDates;
