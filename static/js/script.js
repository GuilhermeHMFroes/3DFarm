document.addEventListener("DOMContentLoaded", function () {
    // Modal Script
    var modal = document.getElementById("myModal");
    var btn = document.getElementById("myBtn");
    var span = document.getElementsByClassName("close")[0];

    btn.onclick = function () {
        modal.style.display = "block";
    };
    span.onclick = function () {
        modal.style.display = "none";
    };
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

    // Form submission for adding printer
    document
        .getElementById("addPrinterForm")
        .addEventListener("submit", function (event) {
            event.preventDefault(); // Prevent form from submitting normally
            var formData = new FormData(this);

            fetch("/add_printer", {
                method: "POST",
                body: formData,
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.message) {
                        alert(data.message);
                        modal.style.display = "none";
                        location.reload(); // Reload the page to show the newly added printer
                    }
                })
                .catch((error) =>
                    console.error("Erro ao adicionar impressora:", error)
                );
        });

    // Variável para armazenar os dados das impressoras
    let printerData = []; // Declarar uma vez, no escopo global

    // Função para buscar o estado de todas as impressoras
    function fetchPrinterStates() {
        fetch("/get_all_printer_statuses")
            .then((response) => response.json())
            .then((data) => {
                console.log("Dados recebidos:", data);

                // Atualizar a variável global com os novos dados
                printerData = data.printer_states;

                // Atualizar o estado das impressoras na interface
                printerData.forEach(updatePrinterState);
            })
            .catch((error) =>
                console.error("Erro ao buscar estados das impressoras:", error)
            );
    }

    // Função para atualizar o estado de uma impressora específica
    function updatePrinterState(printer) {
        const printerId = printer.printer.ip; // ID ou IP da impressora

        // Seleciona a div principal da impressora
        const printerDiv = document.getElementById(`printer-${printerId}`);
        if (printerDiv) {
            // Remove as classes existentes antes de adicionar as novas
            printerDiv.classList.remove("operational", "printing");

            // Adiciona as classes com base no estado
            const printerState = printer.state.state.text || "Desconhecido";
            const isOperational = printer.state.state.flags.operational;
            if (isOperational) {
                printerDiv.classList.add("operational");
            }
            if (printerState.toLowerCase() === "printing") {
                printerDiv.classList.remove("operational");
                printerDiv.classList.add("printing");
            }
        }

        // Atualizando o status
        const statusElement = document.getElementById(
            `printer-status-${printerId}`
        );
        if (statusElement) {
            statusElement.textContent = `Status: ${
                printer.state.state.text || "Desconhecido"
            }`;
        }

        // Atualizando a temperatura da cama
        const bedTempElement = document.getElementById(`bed-temp-${printerId}`);
        if (bedTempElement) {
            const bedTemp = printer.state.temperature.bed.actual || 0;
            const bedTarget = printer.state.temperature.bed.target || 0;
            bedTempElement.textContent = `Cama: ${bedTemp.toFixed(
                2
            )}°C - Alvo: ${bedTarget.toFixed(2)}°C`;
        }

        // Atualizando a temperatura do bico
        const toolTempElement = document.getElementById(
            `tool-temp-${printerId}`
        );
        if (toolTempElement) {
            const toolTemp = printer.state.temperature.tool0.actual || 0;
            const toolTarget = printer.state.temperature.tool0.target || 0;
            toolTempElement.textContent = `Bico: ${toolTemp.toFixed(
                2
            )}°C - Alvo: ${toolTarget.toFixed(2)}°C`;
        }
    }

    // Atualiza o estado das impressoras a cada 1.5 segundos
    setInterval(fetchPrinterStates, 1500);

    // Chamar a função para carregar os dados ao inicializar a página
    fetchPrinterStates();
});
