document.addEventListener("DOMContentLoaded", function () {
    // Modal Script
    var modal = document.getElementById("modalAddPrinter");
    var modalContent = document.getElementById("modalContent");
    var btn = document.getElementById("addprinter");

    // Abrir o modal e carregar o conteúdo
    btn.onclick = function () {
        fetch("/adicionaimpressora")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Erro ao carregar o modal");
                }
                return response.text();
            })
            .then((data) => {
                modalContent.innerHTML = data; // Insere o conteúdo no modal
                modal.style.display = "block";

                // Adicionar eventos ao formulário carregado dinamicamente
                const form = document.getElementById("addPrinterForm");
                form.addEventListener("submit", function (event) {
                    event.preventDefault();

                    const formData = new FormData(form);
                    fetch("/add_printer", {
                        method: "POST",
                        body: formData,
                    })
                        .then((response) => response.json())
                        .then((data) => {
                            alert(data.message);
                            modal.style.display = "none";
                            location.reload();
                        })
                        .catch((error) =>
                            console.error("Erro ao adicionar impressora:", error)
                        );
                });
            })
            .catch((error) => {
                console.error(error);
                alert("Não foi possível carregar o modal.");
            });
    };

    // Fecha o modal ao clicar no "X" ou fora do modal
    window.onclick = function (event) {
        if (event.target.classList.contains("close") || event.target === modal) {
            modal.style.display = "none";
        }
    };

    // Variável para armazenar os dados das impressoras
    let printerData = [];

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
        const printerId = printer.printer.ip;

        // Seleciona a div principal da impressora
        const printerDiv = document.getElementById(`printer-${printerId}`);
        if (printerDiv) {
            printerDiv.classList.remove("operational", "printing");

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
