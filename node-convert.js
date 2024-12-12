import fs from 'fs.js';
import path from 'path.js';

// Helper function to recursively read all files in a directory
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else if (fullPath.endsWith('.js')) {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}

// Function to fix imports/exports in a file
function fixFile(filePath) {
    let fileContent = fs.readFileSync(filePath, 'utf-8');
    let updated = false;

    // Fix import statements (add .js extension if missing)
    fileContent = fileContent.replace(
        /import\s+(.*?)\s+from\s+['"](.*?)(?<!\.js)['"];/g,
        (match, imports, module) => {
            updated = true;
            return `import ${imports} from '${module}.js';`;
        }
    );

    // Fix export statements (convert module.exports to export default)
    fileContent = fileContent.replace(
        /module\.exports\s*=\s*([^;]+);/g,
        (match, exports) => {
            updated = true;
            return `export default ${exports};`;
        }
    );

    // Fix export statements for named exports
    fileContent = fileContent.replace(
        /module\.exports\s*=\s*{([^}]+)}/g,
        (match, exports) => {
            updated = true;
            return `export { ${exports.trim()} };`;
        }
    );

    // Write back only if changes were made
    if (updated) {
        console.log(`Updated: ${filePath}`);
        fs.writeFileSync(filePath, fileContent, 'utf-8');
    }
}

// Main function to process all .js files in the project
function processFiles(baseDir) {
    const allFiles = getAllFiles(baseDir);
    allFiles.forEach((filePath) => {
        fixFile(filePath);
    });
}

// Run the script on the current directory
const baseDir = path.resolve('./'); // Adjust this if needed
processFiles(baseDir);

console.log('Conversion complete!');
