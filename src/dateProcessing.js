// import dateParser from "./dateParser";
import * as chrono from "chrono-node";

const parseTextForDates = (str, reference_date) => {
    var str_with_pages_removed = str.replace(/\[+\[[^)]+\]+\] */g, "");
    var txt;

    if (reference_date) { //forces parsing to use a specific date
        txt = chrono.parse( str_with_pages_removed, reference_date);
    }
    else {
        txt = chrono.parse( str_with_pages_removed);
    }

    if (txt.length > 0) {
        txt.forEach((element) => {
            var roamDate = `[[${roamAlphaAPI.util.dateToPageTitle(element.start.date())}]]`;
            str = str.replace(element.text, roamDate);
        });
        return str;
    } else {
        return str;
    }
};

export default parseTextForDates;
