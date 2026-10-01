import { JSDOM } from "jsdom";
import pkg from "fontoxpath";
const { evaluateXPathToBoolean } = pkg;
import fs from "fs";

// Same BEHAVIOR_CSS_MAP as the real project (relevant entries only, for this test)
const BEHAVIOR_CSS_MAP = {
  alternate: `\n    display: inline;\n  `,
  paragraph: `\n    display: block;\n    margin-top: 1em;\n    margin-bottom: 1em;\n    text-align: justify;\n  `,
  inline: `\n    display: inline;\n  `,
};

const oddPM = fs.readFileSync("./src/odd/basicPM.odd", "utf-8"); // adjust path if needed
const oddDom = new JSDOM(oddPM, { contentType: "text/xml" });
const doc = oddDom.window.document;

/**
 * Replicates the real buildCSS() logic exactly, with one switch:
 * checkPredicate = true  -> current behavior (evaluates predicate against the ODD's own <elementSpec> node)
 * checkPredicate = false -> proposed behavior (skips the predicate check entirely, always applicable)
 */
function buildCSS(checkPredicate) {
  let css = "";
  const elSpecs = doc.querySelectorAll("elementSpec");

  elSpecs.forEach(el => {
    const id = el.getAttribute("ident");
    const elSpecModels = el.querySelectorAll("model");

    elSpecModels.forEach(model => {
      const predicate = model.getAttribute("predicate");
      const cssClass = model.getAttribute("cssClass");
      let applicable = true;

      if (checkPredicate && predicate) {
        applicable = evaluateXPathToBoolean(predicate, el, null, {}, {});
      }

      if (applicable) {
        const behaviour = model.getAttribute("behaviour");
        const behaviourCSS = behaviour ? (BEHAVIOR_CSS_MAP[behaviour] || "") : "";
        const outputRenditions = model.querySelectorAll("outputRendition");
        let outputRenditionCSS = "";
        outputRenditions.forEach(o => { outputRenditionCSS += `${o.textContent}\n`; });

        if (cssClass) {
          css += `tei-${id}, .${cssClass} {\n ${behaviourCSS} ${outputRenditionCSS}}\n`;
        }
        css += `tei-${id} {\n ${behaviourCSS} ${outputRenditionCSS}}\n`;
      }
    });
  });

  return css;
}

const currentOutput = buildCSS(true);
const proposedOutput = buildCSS(false);

console.log("=== CURRENT buildCSS() output (predicate checked against ODD node) ===\n");
console.log(currentOutput);

console.log("\n=== PROPOSED buildCSS() output (predicate check skipped) ===\n");
console.log(proposedOutput);

console.log("\n=== DIFF ===\n");
if (currentOutput === proposedOutput) {
  console.log("IDENTICAL — removing the predicate check from buildCSS() changes NOTHING in its output.");
} else {
  const a = currentOutput.split("\n");
  const b = proposedOutput.split("\n");
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) {
      console.log(`Line ${i}:`);
      console.log(`  current:  ${a[i] ?? "(missing)"}`);
      console.log(`  proposed: ${b[i] ?? "(missing)"}`);
    }
  }
}