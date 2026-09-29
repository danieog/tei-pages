import { JSDOM } from "jsdom";
import pkg from "fontoxpath";
const { evaluateXPathToBoolean } = pkg;
import fs from "fs";

// adjust this path if your ODD file lives elsewhere
const oddPM = fs.readFileSync("./src/odd/basicPM.odd", "utf-8");
const oddDom = new JSDOM(oddPM, { contentType: "text/xml" });
const doc = oddDom.window.document;

const elSpecs = doc.querySelectorAll("elementSpec");

console.log("=== Replicating buildCSS()'s predicate check, against the ODD's own <elementSpec> node ===\n");

elSpecs.forEach(el => {
  const id = el.getAttribute("ident");
  const models = el.querySelectorAll("model");
  models.forEach(model => {
    const predicate = model.getAttribute("predicate");
    const behaviour = model.getAttribute("behaviour");
    if (!predicate) {
      console.log(`elementSpec="${id}" behaviour="${behaviour}" — no predicate attr, always applied`);
      return;
    }
    let result;
    try {
      result = evaluateXPathToBoolean(predicate, el, null, {}, {});
    } catch (e) {
      result = `ERROR: ${e.message}`;
    }
    console.log(`elementSpec="${id}" behaviour="${behaviour}" predicate="${predicate}"  ->  evaluated against <elementSpec> node: ${result}`);
  });
});

console.log("\n=== Now: what SHOULD these predicates return, evaluated against a real TEI <choice> instance? ===\n");

const teiXML = `<?xml version="1.0"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text><body>
    <p><choice><sic>teh</sic><corr>the</corr></choice></p>
  </body></text>
</TEI>`;
const teiDom = new JSDOM(teiXML, { contentType: "text/xml" });
const teiDoc = teiDom.window.document;
const NS = teiDoc.documentElement.namespaceURI;
const choiceNode = teiDoc.getElementsByTagNameNS(NS, "choice")[0];

const predicatesToTest = ["sic and corr", "abbr and expan", "orig and reg", "true()", "false()"];
predicatesToTest.forEach(p => {
  const result = evaluateXPathToBoolean(p, choiceNode, null, () => NS);
  console.log(`predicate="${p}"  ->  evaluated against real <choice> node with <sic>/<corr> children: ${result}`);
});