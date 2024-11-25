document.addEventListener("DOMContentLoaded", function () {
    // Modal Script Add Printer
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

    // Modal Script Printer Manager
    const managePrintersButton = document.getElementById("gerenciarImpressora");
    const modalManage = document.getElementById("modalManagePrinters");
    const modalContentManage = document.getElementById("modalContentManage");

    // Fecha o modal ao clicar no "X" ou fora do modal
    window.onclick = function (event) {
        if (event.target.classList.contains("close") || event.target === modal || event.target === modalManage) {
            modal.style.display = "none";  // Fecha o modal de adicionar impressora
            modalManage.style.display = "none";  // Fecha o modal de gerenciar impressoras
            location.reload();  // Recarrega a página principal ao fechar o modal
        }
    };

    // Abrir o modal e carregar a lista de impressoras
    managePrintersButton.onclick = function () {
        fetch("/manage_printers") // Requisição para pegar a lista de impressoras
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Erro ao carregar lista de impressoras");
                }
                return response.text();  // Retorna o HTML do modal
            })
            .then((html) => {
                modalContentManage.innerHTML = html; // Atualiza o conteúdo do modal com o HTML
                modalManage.style.display = "block"; // Exibe o modal
                attachDeleteHandlers(); // Anexa eventos para remover impressoras
                attachEditHandlers(); // Adiciona eventos para editar impressoras
            })
            .catch((error) =>
                console.error("Erro ao carregar lista de impressoras:", error)
            );
    };

    // Função para adicionar os manipuladores de evento para editar impressoras
    function attachEditHandlers() {
        const editButtons = document.querySelectorAll(".editPrinter");
        editButtons.forEach((button) => {
            button.addEventListener("click", function () {
                const printerIp = this.getAttribute("data-ip");
                const printerNome = this.getAttribute("data-nome");
                const printerPort = this.getAttribute("data-port");
                const printerApi = this.getAttribute("data-api");
                const printerWebcam = this.getAttribute("data-webcam");
    
                // Exibe o formulário de edição no modal
                const editForm = document.getElementById("editPrinterForm");
                editForm.style.display = "block";
    
                // Preenche os campos do formulário com os dados da impressora
                document.getElementById("editNome").value = printerNome;
                document.getElementById("editApi").value = printerApi;
                document.getElementById("editPort").value = printerPort;
                document.getElementById("editWebcam").value = printerWebcam;
                document.getElementById("editIp").value = printerIp;
                
                // Adiciona o evento para salvar as alterações
                const form = document.getElementById("editPrinter");
                form.onsubmit = function (event) {
                    event.preventDefault();
    
                    const formData = {
                        ip: form["ip"].value,
                        nome: form["nome"].value,
                        api_key: form["api_key"].value,
                        port: form["port"].value,
                        webcam_port: form["webcam_port"].value
                    };
    
                    fetch("/update_printer", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(formData),
                    })
                    .then((response) => response.json())
                    .then((data) => {
                        alert(data.message);
                        modalManage.style.display = "none";  // Fecha o modal de gerenciamento
                        location.reload(); // Recarrega a página para mostrar a lista atualizada
                    })
                    .catch((error) =>
                        console.error("Erro ao atualizar impressora:", error)
                    );
                };
            });
        });
    }
    

    // Função para adicionar os manipuladores de evento para remover impressoras
    function attachDeleteHandlers() {
        const deleteButtons = document.querySelectorAll(".deletePrinter");
        deleteButtons.forEach((button) => {
            button.addEventListener("click", function () {
                const printerIp = this.getAttribute("data-ip");
                if (confirm(`Deseja remover a impressora com IP ${printerIp}?`)) {
                    fetch(`/remove_printer`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ ip: printerIp }),
                    })
                    .then((response) => response.json())
                    .then((data) => {
                        if (data.message) {
                            alert(data.message);  // Exibe a mensagem de sucesso
                            location.reload(); // Recarrega a página para mostrar a lista atualizada
                        } else {
                            alert(data.error || "Erro ao remover impressora.");
                        }
                    })
                    .catch((error) =>
                        console.error("Erro ao remover impressora:", error)
                    );
                }
            });
        });
    }

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
