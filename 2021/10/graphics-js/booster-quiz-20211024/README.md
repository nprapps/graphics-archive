booster-quiz-20211024
=====================

This project is a decision-tree quiz with the goal of helping users figure out whether they should consider getting a COVID-19 booster shot, based on current public health guidance.

Key things to know from the [spreadsheet](https://docs.google.com/spreadsheets/d/1y5RL-THOiy_GK5HfoFQIvp-aTtaZmxtGxnzblPNZtDQ/edit#gid=1401251923):

* The content for every question is defined in a single row:
  * `number` - Question number
  * `question` - Text of the question
  * `option_` - Answer option
    * If the answer in the spreadsheet is `skipToAnswer`, this triggers some special handling. No answer option is displayed, and instead users see the full answer text. (This is relevant to the end question — "Which shot should you get?" — which offers guidance rather than soliciting user input.)
    * If the answer in the spreadsheet is `None`, there is no content for this answer option and it is omitted from the output.
  * `answer_` - Full-length answer text, which usually displays after the user clicks on this answer option. _(optional)_
  * `next_` - Which question number to jump to after selecting this answer option
    * If the answer in the spreadsheet is `END`, it means that this is the end of this branch of questioning, and there are no further questions.
