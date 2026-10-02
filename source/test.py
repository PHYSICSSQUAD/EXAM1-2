import asyncio, pathlib, sys
from playwright.async_api import async_playwright
U = sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent.joinpath('index.html').as_uri()
async def run(mode, sec=None):
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1280,'height':900})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('requestfailed', lambda r: errs.append('404 ' + r.url[:80]))
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await pg.goto(U + ('?sec=%d' % sec if sec else '')); await pg.wait_for_timeout(400)
        await pg.fill('#nm', 'Test Student'); await pg.click('#go'); await pg.wait_for_timeout(400)
        if mode == 'timeout':
            await pg.wait_for_timeout(9000)
            print('timeout ->', (await pg.inner_text('.verdict')).strip(), '| errs', len(errs), errs[:2]); await b.close(); return
        await pg.evaluate("""(m)=>{for(const q of window.EXAM){
          if(q.type==='mcq'){const ci=q.options.findIndex(o=>o.c);const k=m==='all'?ci:(ci+1)%q.options.length;document.querySelectorAll('.opt[data-q="'+q.id+'"]')[k].click();}
          else if(q.type==='match'){for(const r of q.rows){const c=m==='all'?q.answer[r.id]:q.choices.find(x=>x.id!==q.answer[r.id]).id;document.querySelector('.chip[data-q="'+q.id+'"][data-r="'+r.id+'"][data-c="'+c+'"]').click();}}
          else{const ta=document.querySelector('textarea[data-q="'+q.id+'"]');ta.value=m==='all'?q.answer:'i do not know';ta.dispatchEvent(new Event('input',{bubbles:true}));}}}""", mode)
        await pg.click('#submit'); await pg.wait_for_timeout(900)
        print(f"{mode:7s} ->", (await pg.inner_text('.verdict')).strip(), '|', (await pg.inner_text('.ring .val')).replace('\n',' '),
              '| questions', await pg.evaluate("window.EXAM.length"), '| errs', len(errs), errs[:2])
        await b.close()
asyncio.run(run('all')); asyncio.run(run('wrong')); asyncio.run(run('timeout', sec=6))
