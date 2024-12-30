const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// コマンドライン引数を取得
const [templatePath, outputPath, componentName] = process.argv.slice(2);

if (!templatePath || !outputPath || !componentName) {
    console.error('Usage: node generate.js <template-path> <output-dir> <component-name>');
    process.exit(1);
}

try {
    // テンプレートを読み込む
    const template = fs.readFileSync(templatePath, 'utf-8');

    // テンプレートをコンパイル
    const compiledTemplate = Handlebars.compile(template);

    // データを用意
    const data = {
        component: componentName
    };

    // テンプレートを実行
    const result = compiledTemplate(data);

    // 結果を出力
    fs.writeFileSync(outputPath, result);
} catch (error) {
    console.error('Error generating component:', error);
    process.exit(1);
}
