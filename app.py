from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from datetime import timedelta
import os
from poker.game import start_round, next_street, submit_guess
from poker.cards import serialize_cards, serialize_cards_ru
from poker.monte_carlo import simulate_equity


def create_app() -> Flask:
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-me')
    app.permanent_session_lifetime = timedelta(hours=8)

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/trainer')
    def trainer():
        try:
            players = int(request.args.get('players', '5'))
        except ValueError:
            players = 5
        players = max(2, min(players, 9))
        return render_template('trainer.html', players=players)

    @app.route('/results')
    def results():
        return render_template('results.html')

    # API stubs — будут доработаны в следующих шагах
    @app.post('/api/new_round')
    def api_new_round():
        data = request.get_json(silent=True) or {}
        players = int(data.get('players', 5))
        players = max(2, min(players, 9))
        # Инициализация раунда
        session.permanent = True
        rnd = start_round(players)
        session['round'] = rnd
        return jsonify({
            'ok': True,
            'players': players,
            'hero': serialize_cards_ru(rnd['hero']),
            'board': serialize_cards_ru(rnd['board']),
            'state': rnd['state'],
            'guess_required': True,
        })

    @app.post('/api/board')
    def api_board():
        # Заглушка: вернём 400, если раунд не инициализирован
        if 'round' not in session:
            return jsonify({'error': 'round_not_initialized'}), 400
        rnd = session['round']
        try:
            rnd = next_street(rnd)
        except Exception as e:
            return jsonify({'error': str(e)}), 400
        session['round'] = rnd
        return jsonify({
            'state': rnd['state'],
            'board': serialize_cards_ru(rnd['board']),
            'guess_required': not rnd.get('guess_submitted', False)
        })

    @app.post('/api/guess')
    def api_guess():
        if 'round' not in session:
            return jsonify({'error': 'round_not_initialized'}), 400
        data = request.get_json(silent=True) or {}
        print('data guess:', data)
        value = data.get('value')
        rnd = session['round']
        print('rnd:', rnd)
        rnd = submit_guess(rnd, value)
        session['round'] = rnd
        return jsonify({
            'ok': True,
            'state': rnd['state'],
            'guess_required': not rnd.get('guess_submitted', False)
        })

    @app.post('/api/odds')
    def api_odds():
        if 'round' not in session:
            return jsonify({'error': 'round_not_initialized'}), 400
        data = request.get_json(silent=True) or {}
        print('data odds:', data)
        max_error = float(data.get('max_error', 0.01))
        max_iters = int(data.get('max_iters', 200000))
        rnd = session['round']
        if not rnd.get('guess_submitted'):
            return jsonify({'error': 'guess_required_before_odds'}), 400
        p, t, l, se, iters = simulate_equity(rnd['players'], rnd['hero'], rnd['board'], max_error=max_error, max_iters=max_iters)
        return jsonify({'win': round(p * 100, 2), 'tie': round(t * 100, 2), 'lose': round(l * 100, 2), 'se': se, 'iters': iters})

    @app.post('/api/showdown')
    def api_showdown():
        if 'round' not in session:
            return jsonify({'error': 'round_not_initialized'}), 400
        rnd = session['round']
        deck = rnd.get('deck', [])
        board = list(rnd.get('board', []))
        players = int(rnd.get('players', 5))
        hero = list(rnd.get('hero', []))
        opponents = list(rnd.get('opponents', []))
        if rnd.get('state') != 'river':
            return jsonify({'error': 'showdown_only_on_river'}), 400

        # Доложим оставшиеся борд-карты до 5
        if len(board) < 5:
            need = 5 - len(board)
            if len(deck) < need:
                return jsonify({'error': 'deck_exhausted'}), 400
            board.extend(deck[:need])
            deck = deck[need:]

        # Оппоненты уже розданы в начале раунда и фиксированы
        if len(opponents) != players - 1:
            return jsonify({'error': 'opponents_not_initialized'}), 400

        # Оценка победителей
        from poker.hand_rank import best5_of7_rank
        hero_rank = best5_of7_rank(hero + board)
        all_ranks = [hero_rank]
        for opp in opponents:
            all_ranks.append(best5_of7_rank(opp + board))
        best_rank = max(all_ranks)
        winners = [i for i, rk in enumerate(all_ranks) if rk == best_rank]

        # Обновим сессию как завершённый раунд
        rnd['deck'] = deck
        rnd['board'] = board
        rnd['state'] = 'showdown'
        session['round'] = rnd

        return jsonify({
            'state': rnd['state'],
            'hero': serialize_cards_ru(hero),
            'board': serialize_cards_ru(board),
            'opponents': [serialize_cards_ru(h) for h in opponents],
            'winners': winners,  # 0 — герой; 1..N — оппоненты
        })

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=True)


