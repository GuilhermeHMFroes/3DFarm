from flask import render_template
from printer_state import get_all_printer_statuses  # Função para obter o status de todas as impressoras

def home():
    """
    Exibe a página principal com o feed da câmera e o estado das impressoras.
    """
    try:
        # Obtém o estado de todas as impressoras cadastradas no banco de dados
        printer_states, disconnected_printers = get_all_printer_statuses()

        # Verifica se a lista de impressoras está vazia
        if not printer_states:
            # Se não houver impressoras, mostra uma mensagem na página principal
            return render_template('index.html', error_message="Nenhuma impressora cadastrada.", disconnected_printers=disconnected_printers)
        
        # Caso contrário, renderiza a página com os dados das impressoras
        return render_template(
            'index.html',
            printer_states=printer_states,
            disconnected_printers=disconnected_printers,
            error_message=None  # Garantindo que a variável de erro esteja vazia
        )

    except Exception as e:
        # Em caso de erro, loga o erro e renderiza a página com a mensagem de erro
        print(f"Erro ao carregar a página principal: {e}")
        return render_template('index.html', error_message="Erro ao carregar as impressoras.", disconnected_printers=disconnected_printers), 500
