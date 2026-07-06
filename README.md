# 🏋️ Assistente de Treino

App mobile-first para conduzir seus treinos **série por série, sem perder o fio**. Timer de descanso com anel de progresso, histórico com evolução de carga e progresso salvo automaticamente no próprio dispositivo.

Feito em **HTML + CSS + JavaScript puro** — sem build, sem dependências, sem framework. É só abrir.

## ✨ Funcionalidades

- **Criar e editar treinos** com exercícios, séries, repetições, carga, descanso e observações
- **Modo execução** que guia série por série, com bolinhas de progresso e trilha de exercícios
- **Timer de descanso** com anel animado, pausar/continuar, ±15s, reiniciar e pular — com bip sonoro e vibração ao terminar
- **Editar a carga em tempo real** durante o treino
- **Histórico** de treinos realizados + **evolução de carga** por exercício
- **Progresso salvo** automaticamente via `localStorage` (continua de onde parou, mesmo se fechar o app)

## 🚀 Como rodar localmente

Não precisa de servidor — abra o `index.html` direto no navegador. Ou, para simular o ambiente real:

```bash
# Python 3
python3 -m http.server 8000
# depois abra http://localhost:8000
```

## 🌐 Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie estes arquivos:
   ```bash
   git init
   git add .
   git commit -m "Assistente de treino"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
   git push -u origin main
   ```
2. No GitHub, vá em **Settings → Pages**.
3. Em **Source**, selecione a branch `main` e a pasta `/ (root)`.
4. Salve. Em alguns minutos o app estará no ar em:
   `https://SEU-USUARIO.github.io/SEU-REPO/`

## 📁 Estrutura

```
├── index.html   # estrutura da página
├── style.css    # tema dark, layout mobile-first
├── app.js       # toda a lógica (estado, telas, timer, storage)
└── README.md
```

## 📝 Notas

- Os dados ficam **apenas no navegador do dispositivo** (`localStorage`). Limpar os dados do site apaga os treinos e o histórico.
- O bip de fim de descanso usa a Web Audio API e a vibração usa a Vibration API (disponível na maioria dos celulares).

---

Feito com 💚 para não perder o ritmo entre as séries.
