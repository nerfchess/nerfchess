#!/bin/bash
#   scripts/polish/heavy.sh bash scripts/polish/i/strips.sh before [subject ...]
# Writes docs/polish-pass/evidence/I/<label>/<subject>-<anim>.{png,json}.
set -u
cd /home/user/nerfchess || exit 1
label=$1; shift
subjects=${*:-"god draft dock chevron eval presence tour"}
T=./node_modules/.bin/tsx
for subj in $subjects; do
  for anim in ${ANIMS:-full fast off reduced}; do
    common=(--anim "$anim" --evidence "I/$label" --name "$subj-$anim")
    case $subj in
      god) $T scripts/polish/strip.ts --route /dev/motion --click "[data-testid=god-notice]" --clip "[data-clip=notices]" --pad 60 --duration 1800 --interval 75 --columns 13 "${common[@]}" ;;
      draft) $T scripts/polish/strip.ts --route /dev/motion --click "[data-testid=draft-notice]" --clip "[data-clip=notices]" --pad 60 --duration 3900 --interval 150 --columns 14 "${common[@]}" ;;
      dock) $T scripts/polish/strip.ts --route /dev/motion --click "[data-testid=dock-add]" --clip "[data-clip=dock]" --pad 40 --duration 700 --interval 50 "${common[@]}" ;;
      # A use burst on a settled row, long enough to see the burst class drop
      # (900ms): before the review round 1 fix the row replayed its entrance.
      dockuse) $T scripts/polish/strip.ts --route /dev/motion --click "[data-testid=dock-use]" --clip "[data-clip=dock]" --pad 40 --duration 1300 --interval 100 --columns 14 "${common[@]}" ;;
      chevron) $T scripts/polish/strip.ts --route /dev/motion --click "[data-clip=dock] button[aria-expanded] >> nth=0" --clip "[data-clip=dock]" --pad 8 --duration 240 --interval 20 "${common[@]}" ;;
      eval) $T scripts/polish/strip.ts --route /dev/motion --click "[data-testid=eval-swing]" --clip "[data-clip=eval]" --pad 8 --duration 480 --interval 40 "${common[@]}" ;;
      presence) $T scripts/polish/strip.ts --route /dev/motion --hover "[data-clip=presence]" --clip "[data-clip=presence]" --pad 8 --duration 1950 --interval 150 "${common[@]}" ;;
      tour) $T scripts/polish/strip.ts --route /dev/motion --trigger scripts/polish/i/tour-step.ts --duration 1100 --interval 100 --columns 6 --scale 0.35 "${common[@]}" ;;
    esac
  done
done
