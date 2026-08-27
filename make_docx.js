const fs = require('fs');
const archiver = require('archiver');

const output = fs.createWriteStream('dummy.docx');
const archive = archiver('zip', { zlib: { level: 9 } });

archive.pipe(output);
archive.append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body></w:document>', { name: 'word/document.xml' });
archive.append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>', { name: '_rels/.rels' });
archive.append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>', { name: '[Content_Types].xml' });
archive.finalize();

output.on('close', async () => {
  const fileType = await import('file-type');
  const buf = fs.readFileSync('dummy.docx');
  const sniffed = await fileType.fileTypeFromBuffer(buf);
  console.log("Sniffed dummy.docx:", sniffed);
});
