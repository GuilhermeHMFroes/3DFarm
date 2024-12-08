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

    // Elementos da página
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("fileInput");
    const fileList = document.getElementById("fileList");

    // Função para gerar o item da lista de arquivos
    function createFileItem(fileName) {
        const fileItem = document.createElement("div");
        fileItem.classList.add("file-item");
        fileItem.innerHTML = `
            <span class="file-name">${fileName}</span>
            <button class="btn deleteFile" data-file="${fileName}">Excluir</button>
            <button class="btn printFile" data-file="${fileName}">Imprimir</button>
        `;
        return fileItem;
    }


    // Função para criar e exibir os itens de arquivo na lista
    function renderFileList(files) {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';  // Limpa a lista de arquivos antes de adicionar novos itens
    
        if (files.length > 0) {
            // Exibe os arquivos na lista
            files.forEach(file => {
                const fileItem = createFileItem(file);
                fileList.appendChild(fileItem);
            });
        } else {
            // Exibe a mensagem quando não há arquivos
            fileList.innerHTML = "<p>Nenhum arquivo encontrado.</p>";
        }
    
        attachDeleteHandler();  // Conecta os eventos de exclusão
        attachPrintHandler();   // Conecta os eventos de impressão
    }
    
    
    // Eventos para arrastar e soltar
    uploadArea.addEventListener("dragover", (event) => {
        event.preventDefault();
        uploadArea.style.borderColor = "#4CAF50"; // Muda a cor da borda durante o arraste
    });

    uploadArea.addEventListener("dragleave", () => {
        uploadArea.style.borderColor = "#ccc"; // Restaura a cor da borda quando o item sai da área
    });

    uploadArea.addEventListener("drop", (event) => {
        event.preventDefault();
        uploadArea.style.borderColor = "#ccc"; // Restaura a cor da borda após o item ser solto

        const file = event.dataTransfer.files[0];
        if (file) {
            uploadFile(file);
        }
    });

    // Clique para abrir o seletor de arquivos
    uploadArea.addEventListener("click", () => {
        fileInput.click();
    });

    // Quando um arquivo for selecionado pelo input
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (file) {
            uploadFile(file);
        }
    });

    // Listar arquivos
    fetch('/list_files')
    .then(response => response.json())
    .then(data => {
        console.log(data); // Adiciona um log para ver o que está sendo retornado
        if (data.success) {
            renderFileList(data.files); // Exibe os arquivos carregados
        } else {
            document.getElementById('fileList').innerHTML = "<p>Erro ao carregar a lista de arquivos.</p>";
        }
    })
    .catch((error) => {
        console.error("Erro ao carregar arquivos:", error);
        document.getElementById('fileList').innerHTML = "<p>Erro ao carregar arquivos.</p>";
    });
    
    // Excluir arquivos
    function attachDeleteHandler() {
        const deleteButtons = document.querySelectorAll('.deleteFile');
        deleteButtons.forEach((button) => {
            button.addEventListener('click', function () {
                const fileName = this.getAttribute('data-file');
                if (confirm(`Tem certeza que deseja excluir o arquivo ${fileName}?`)) {
                    fetch('/delete_file', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ fileName }),
                    })
                    .then((response) => response.json())
                    .then((data) => {
                        if (data.success) {
                            alert(data.message || 'Arquivo excluído com sucesso!');
                            // Recarrega a lista de arquivos após a exclusão
                            fetch('/list_files')
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        renderFileList(data.files); // Re-renderiza a lista de arquivos
                                    }
                                })
                                .catch((error) => {
                                    console.error('Erro ao carregar arquivos:', error);
                                    alert('Erro ao carregar arquivos.');
                                });
                        } else {
                            alert(data.message || 'Erro ao excluir o arquivo.');
                        }
                    })
                    .catch((error) => {
                        console.error('Erro ao excluir arquivo:', error);
                        alert('Erro ao excluir arquivo.');
                    });
                }
            });
        });
    }

    //Carregar lista arquivos
    function attachPrintHandler() {
        const printButtons = document.querySelectorAll('.printFile');
        printButtons.forEach((button) => {
            button.addEventListener('click', function () {
                const fileName = this.getAttribute('data-file');
                openPrintModal(fileName); // Chama a função para abrir o modal de impressão
            });
        });
    }
    

    //Modal de impressão

    function attachPrintHandler() {
        const printButtons = document.querySelectorAll('.printFile');
        printButtons.forEach(button => {
            button.addEventListener('click', function () {
                const fileName = this.getAttribute('data-file');
                openPrintModal(fileName);  // Chama a função para abrir o modal de impressão com o nome do arquivo
            });
        });
    }

    // Função para abrir o modal de impressão
    function openPrintModal(fileName) {
        const modal = document.getElementById("modalPrint");
        const modalContent = document.getElementById("modalContentPrinting");

        // Requisição para pegar o conteúdo do modal
        fetch("/get_print_modal")
            .then(response => response.text())
            .then(html => {
                modalContent.innerHTML = html; // Atualiza o conteúdo do modal com o template de impressão
                modal.style.display = "block"; // Exibe o modal

                // Após carregar o modal, buscar a lista de impressoras
                fetch("/list_printers")
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            const printerListDiv = document.getElementById("printerList");
                            if (data.printers.length > 0) {
                                printerListDiv.innerHTML = data.printers.map(printer => `
                                    <div class="printer-item">
                                        <input type="radio" name="printer" value="${printer.ip}" id="printer-${printer.ip}">
                                        <label for="printer-${printer.ip}">${printer.nome}</label>
                                    </div>
                                `).join('');
                            } else {
                                printerListDiv.innerHTML = "<p>Nenhuma impressora disponível.</p>";
                            }

                            // Configura evento para o botão "Confirmar Impressão"
                            const confirmButton = document.getElementById("confirmPrint");
                            confirmButton.onclick = function () {
                                const selectedPrinter = document.querySelector('input[name="printer"]:checked');
                                if (!selectedPrinter) {
                                    alert("Por favor, selecione uma impressora.");
                                    return;
                                }

                                const printerIp = selectedPrinter.value;

                                // Envia a solicitação de impressão com o fileName
                                fetch("/start_print", {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({ printer_ip: printerIp, file_name: fileName }),
                                })
                                    .then(response => response.json())
                                    .then(data => {
                                        if (data.success) {
                                            alert(data.message);
                                            modal.style.display = "none"; // Fecha o modal após sucesso
                                        } else {
                                            alert("Erro ao iniciar impressão: " + data.message);
                                        }
                                    })
                                    .catch(error => {
                                        console.error("Erro ao iniciar impressão:", error);
                                        alert("Erro ao iniciar impressão.");
                                    });
                            };
                        } else {
                            alert("Erro ao carregar impressoras: " + data.message);
                        }
                    })
                    .catch(error => {
                        console.error("Erro ao carregar lista de impressoras:", error);
                        const printerListDiv = document.getElementById("printerList");
                        printerListDiv.innerHTML = "<p>Erro ao carregar lista de impressoras.</p>";
                    });
            })
            .catch(error => {
                console.error("Erro ao carregar o modal de impressão:", error);
                alert("Erro ao carregar o modal.");
            });
    };

    function startPrinting(printerIp, fileName) {
        if (!printerIp || !fileName) {
            alert("Erro: IP da impressora ou nome do arquivo está faltando.");
            return;
        }
        
        console.log("Iniciando impressão com:", printerIp, fileName); // Log para depuração
        fetch('/start_print', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                printer_ip: printerIp,
                file_name: fileName,
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Impressão iniciada com sucesso!");
            } else {
                alert("Erro ao iniciar impressão: " + data.message);
            }
        })
        .catch(error => {
            console.error("Erro ao enviar comando de impressão:", error);
            alert("Erro ao enviar comando de impressão.");
        });
    }
        
        

});
