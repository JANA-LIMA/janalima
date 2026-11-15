# Modo Palco ao vivo
- [x] Sessão persistente com escrita exclusiva do admin e Realtime.
- [x] Sincronização, navegação independente, reconexão e setlist local.
- [x] Contagem de músicos conectados e preservação do Wake Lock.
- [x] Testes de regras e verificação entre aparelhos (admin e músico autenticados, bloqueio de escrita, reconexão e expiração da presença).

# Limpeza de inscrições push
- [x] Função protegida para limpeza pelo admin, sem chave privilegiada.
- [x] Limpeza não interrompe envio em caso de falha e registra apenas no servidor.
- [x] Testes de envio, falhas e acesso à função aplicada (4 testes passaram; admin executou a limpeza e enviou teste pela tela).