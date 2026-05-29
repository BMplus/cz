const url = 'katalog.pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

let pdfDoc = null,
    flipbook = $('#flipbook');

pdfjsLib.getDocument(url).promise.then(pdf => {
    pdfDoc = pdf;
    const numPages = pdf.numPages;
    let loadedPages = 0;

    for (let i = 1; i <= numPages; i++) {
        const pageDiv = $('<div class="page"></div>');
        const canvas = document.createElement('canvas');
        pageDiv.append(canvas);
        flipbook.append(pageDiv);

        pdf.getPage(i).then(page => {
            const viewport = page.getViewport({ scale: 1.5 });
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
                        width: flipbook.width(),
                        height: flipbook.height(),
                        elevation: 50,
                        gradients: true,
                        autoCenter: true
                    });
                }
            });
        });
    }
});

$(window).resize(function() {
    flipbook.turn('size', flipbook.width(), flipbook.height());
});
