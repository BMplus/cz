const url = 'katalog.pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

let pdfDoc = null,
    flipbook = $('#flipbook');

pdfjsLib.getDocument(url).promise.then(pdf => {
    pdfDoc = pdf;
    const numPages = pdf.numPages;
    let loadedPages = 0;

    // Vytáhneme si rozměry z první stránky
    pdf.getPage(1).then(firstPage => {
        const initialViewport = firstPage.getViewport({ scale: 1.0 });
        
        // Výška kontejneru s malou rezervou (90% výšky okna)
        const containerHeight = $('#canvas-container').height() * 0.90;
        
        // Spočítáme poměr stran JEDNÉ stránky (šířka / výška)
        const pageRatio = initialViewport.width / initialViewport.height;
        
        // Ideální výška knihy bude podle obrazovky
        let bookHeight = containerHeight;
        // Šířka celé knihy (dvojstrany) bude: výška * poměr stran * 2 stránky
        let bookWidth = bookHeight * pageRatio * 2;
        
        // Pojistka pro případ, že by se to nevešlo na šířku obrazovky
        const maxContainerWidth = $('#canvas-container').width() * 0.95;
        if (bookWidth > maxContainerWidth) {
            bookWidth = maxContainerWidth;
            bookHeight = bookWidth / (pageRatio * 2);
        }

        // Nastavíme správné proporce, aby se katalog nedeformoval
        flipbook.css({ width: bookWidth, height: bookHeight });

        for (let i = 1; i <= numPages; i++) {
            const pageDiv = $('<div class="page"></div>');
            const canvas = document.createElement('canvas');
            pageDiv.append(canvas);
            flipbook.append(pageDiv);

            pdf.getPage(i).then(page => {
                const pageTargetWidth = bookWidth / 2;
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
                    loadedPages++;
                    if (loadedPages === numPages) {
                        flipbook.turn({
                            width: bookWidth,
                            height: bookHeight,
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

// Oprava proporcí při změně velikosti okna
$(window).resize(function() {
    if (pdfDoc) {
        pdfDoc.getPage(1).then(page => {
            const viewport = page.getViewport({ scale: 1.0 });
            const pageRatio = viewport.width / viewport.height;
            
            const containerHeight = $('#canvas-container').height() * 0.90;
            let bookHeight = containerHeight;
            let bookWidth = bookHeight * pageRatio * 2;
            
            const maxContainerWidth = $('#canvas-container').width() * 0.95;
            if (bookWidth > maxContainerWidth) {
                bookWidth = maxContainerWidth;
                bookHeight = bookWidth / (pageRatio * 2);
            }
            
            flipbook.turn('size', bookWidth, bookHeight);
        });
    }
});
