const url = 'katalog.pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

let pdfDoc = null,
    flipbook = $('#flipbook');

function resizeBook(initialViewport) {
    // Zvětšeno na 98% šířky a 98% výšky dostupného prostoru pro maximální roztažení
    const containerWidth = $('#canvas-container').width() * 0.98;
    const containerHeight = $('#canvas-container').height() * 0.98;
    const pageRatio = initialViewport.width / initialViewport.height;
    
    let bookHeight = containerHeight;
    let bookWidth = bookHeight * pageRatio * 2;
    
    if (bookWidth > containerWidth) {
        bookWidth = containerWidth;
        bookHeight = bookWidth / (pageRatio * 2);
    }
    
    return { width: bookWidth, height: bookHeight, ratio: pageRatio };
}

pdfjsLib.getDocument(url).promise.then(pdf => {
    pdfDoc = pdf;
    const numPages = pdf.numPages;
    
    $('#btn-end').attr('onclick', `$('#flipbook').turn('page', ${numPages})`);
    
    pdf.getPage(1).then(firstPage => {
        const initialViewport = firstPage.getViewport({ scale: 1.0 });
        const dimensions = resizeBook(initialViewport);
        
        flipbook.css({ width: dimensions.width, height: dimensions.height });

        let renderedPages = 0;

        for (let i = 1; i <= numPages; i++) {
            const pageDiv = $('<div class="page"></div>');
            const canvas = document.createElement('canvas');
            pageDiv.append(canvas);
            flipbook.append(pageDiv);

            pdf.getPage(i).then(page => {
                const pageTargetWidth = dimensions.width / 2;
                const pageViewport = page.getViewport({ scale: 1.0 });
                // Zvýšíme kvalitu renderování (scale) přímo pro plátno, aby byl text ostrý i při maximálním zvětšení
                const scale = (pageTargetWidth / pageViewport.width) * 1.5; 
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
                    if (renderedPages === numPages) {
                        flipbook.turn({
                            width: dimensions.width,
                            height: dimensions.height,
                            elevation: 50,
                            gradients: true,
                            autoCenter: true
                        });
                        
                        window.addEventListener('wheel', function(e) {
                            if (e.deltaY > 0) {
                                flipbook.turn('next');
                            } else if (e.deltaY < 0) {
                                flipbook.turn('previous');
                            }
                        }, { passive: true });
                    }
                });
            });
        }
    });
});

$(window).resize(function() {
    if (pdfDoc) {
        pdfDoc.getPage(1).then(page => {
            const initialViewport = page.getViewport({ scale: 1.0 });
            const dimensions = resizeBook(initialViewport);
            flipbook.turn('size', dimensions.width, dimensions.height);
        });
    }
});
