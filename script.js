const url = 'katalog.pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

let pdfDoc = null,
    flipbook = $('#flipbook');

function resizeBook(initialViewport) {
    const containerWidth = $('#canvas-container').width() * 0.95;
    const containerHeight = $('#canvas-container').height() * 0.90;
    
    // Přirozený poměr stran jedné stránky z PDF (šířka / výška)
    const pageRatio = initialViewport.width / initialViewport.height;
    
    // Spočítáme rozměry pro dvojstranu
    let bookHeight = containerHeight;
    let bookWidth = bookHeight * pageRatio * 2;
    
    // Pokud by to bylo moc široké, přizpůsobíme to podle šířky obrazovky
    if (bookWidth > containerWidth) {
        bookWidth = containerWidth;
        bookHeight = bookWidth / (pageRatio * 2);
    }
    
    return { width: bookWidth, height: bookHeight, ratio: pageRatio };
}

pdfjsLib.getDocument(url).promise.then(pdf => {
    pdfDoc = pdf;
    const numPages = pdf.numPages;
    
    // Nejdříve načteme první stránku, abychom znali přesný formát (A4 na výšku)
    pdf.getPage(1).then(firstPage => {
        const initialViewport = firstPage.getViewport({ scale: 1.0 });
        const dimensions = resizeBook(initialViewport);
        
        // Nastavíme natvrdo rozměry kontejneru ještě PŘEDTÍM, než Turn.js vůbec vznikne
        flipbook.css({ width: dimensions.width, height: dimensions.height });

        let renderedPages = 0;

        // Vytvoříme plátna pro všechny stránky
        for (let i = 1; i <= numPages; i++) {
            const pageDiv = $('<div class="page"></div>');
            const canvas = document.createElement('canvas');
            pageDiv.append(canvas);
            flipbook.append(pageDiv);

            pdf.getPage(i).then(page => {
                const pageTargetWidth = dimensions.width / 2;
                const pageViewport = page.getViewport({ scale: 1.0 });
                const scale = pageTargetWidth / pageViewport.width;
                const viewport = page.getViewport({ scale: scale });
                
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                
                page.render(renderContext).promise.then(() => {
                    renderedPages++;
                    // Jakmile jsou všechny stránky připravené v perfektním poměru, zapneme Turn.js
                    if (renderedPages === numPages) {
                        flipbook.turn({
                            width: dimensions.width,
                            height: dimensions.height,
                            elevation: 50,
                            gradients: true,
                            autoCenter: true
                        });
                    }
                });
            });
        }
    });
});

// Správné chování při změně velikosti okna prohlížeče
$(window).resize(function() {
    if (pdfDoc) {
        pdfDoc.getPage(1).then(page => {
            const initialViewport = page.getViewport({ scale: 1.0 });
            const dimensions = resizeBook(initialViewport);
            flipbook.turn('size', dimensions.width, dimensions.height);
        });
    }
});
