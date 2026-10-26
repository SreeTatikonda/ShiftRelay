import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,readiness,applyAction} from '../lib/shiftrelay/domain.ts';
function ready(){let s=seed();s=applyAction(s,{id:'acme',action:'acceptDates',persona:'teammate'});s=applyAction(s,{id:'acme',action:'acceptTask',taskId:'t1',persona:'teammate'});s=applyAction(s,{id:'acme',action:'answer',questionId:'q1',text:'The approved deck is in the project folder.',persona:'owner'});return s;}
test('calendar acceptance alone cannot establish readiness',()=>{const s=applyAction(seed(),{id:'acme',action:'acceptDates',persona:'teammate'});assert.equal(readiness(s.handovers[0]).ready,false)});
test('all independent checks make coverage ready',()=>assert.equal(readiness(ready().handovers[0]).ready,true));
test('changed dates revoke availability and every task acceptance',()=>{const s=applyAction(ready(),{id:'acme',action:'dates',start:'2026-11-03',end:'2026-11-07',persona:'owner'});assert.equal(s.handovers[0].datesAccepted,false);assert(s.handovers[0].tasks.every(t=>!t.accepted));assert.equal(readiness(s.handovers[0]).ready,false)});
test('material task edits revoke only affected acceptance',()=>{const s=applyAction(ready(),{id:'acme',action:'editTask',taskId:'t1',title:'New scope',owner:'Priya Shah',persona:'owner'});assert.equal(s.handovers[0].tasks[0].accepted,false);assert.equal(s.handovers[0].tasks[1].accepted,true)});
test('declining coverage blocks readiness',()=>{const s=applyAction(ready(),{id:'acme',action:'declineTask',taskId:'t1',persona:'teammate'});assert.equal(readiness(s.handovers[0]).ready,false)});
test('new blocking clarification invalidates readiness',()=>{const s=applyAction(ready(),{id:'acme',action:'question',text:'Which version?',persona:'teammate'});assert.equal(readiness(s.handovers[0]).ready,false)});
test('duplicate send keys create one demo receipt',()=>{const action={id:'acme',action:'send',persona:'owner',to:'priya@example.com',subject:'Coverage',body:'Please review',key:'test-key'};const s=applyAction(applyAction(seed(),action),action);assert.equal(s.outbox.length,1);assert.equal(s.outbox[0].mode,'simulated')});
test('owner cannot accidentally acknowledge as teammate',()=>assert.throws(()=>applyAction(seed(),{id:'acme',action:'acceptDates',persona:'owner'})));
test('draft work cannot be accepted before request',()=>{const s=seed();s.handovers[0].requested=false;assert.throws(()=>applyAction(s,{id:'acme',action:'acceptTask',taskId:'t1',persona:'teammate'}))});
test('date ranges are validated',()=>assert.throws(()=>applyAction(seed(),{id:'acme',action:'dates',start:'2026-11-07',end:'2026-11-01',persona:'owner'})));
test('transitions do not mutate the previous snapshot',()=>{const s=seed();applyAction(s,{id:'acme',action:'acceptDates',persona:'teammate'});assert.equal(s.handovers[0].datesAccepted,false)});
