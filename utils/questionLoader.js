import fs from 'fs-extra';
import path from 'path';

export function loadQuestionBank(interviewType) {
  const fileMap = {
    "Product Design": "product_design.json",
    "Product Improvement": "product_improvement.json",
    "Product Metrics": "product_metrics.json",
    "Root Cause": "root_cause.json",
    "Guesstimate": "guesstimate.json"
  };

  const fileName = fileMap[interviewType];
  if (!fileName) throw new Error("Invalid interview type");

  const filePath = path.join('./data', fileName);
  return fs.readJsonSync(filePath);
}
