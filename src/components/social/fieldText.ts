// The text size every form field on the social pages uses (F155): 16px below
// the sm breakpoint, where iOS Safari zooms the page into any field set
// smaller than 16px and the 14px floor for phone text applies, and the dense
// 13px from sm up. One constant so the sites cannot drift apart again.
export const FIELD_TEXT = "text-[16px] sm:text-[13px]";
