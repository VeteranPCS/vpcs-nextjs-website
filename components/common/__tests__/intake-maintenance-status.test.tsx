// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { IntakeMaintenanceProvider, useIntakeMaintenanceFeedback } from '../IntakeMaintenance';
import { maintenanceNotSent } from '@/lib/leads/intake-maintenance';

function Form({ submit }: { submit: () => Promise<unknown> }) {
 const { maintenanceNotice, handleMaintenanceResult } = useIntakeMaintenanceFeedback();
 return <form aria-label="Test request" onSubmit={async event => { event.preventDefault(); handleMaintenanceResult(await submit()); }}>
  {maintenanceNotice}<label>Name<input name="name" /></label><button>Submit</button>
 </form>;
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('already-open maintenance notice', () => {
 it('refreshes uncached status without remounting fields, auto-submitting, or retaining personal data in storage', async () => {
   const fetch = vi.fn().mockResolvedValueOnce(Response.json({ active:false,message:'' }))
    .mockResolvedValueOnce(Response.json({ active:true,message:'Maintenance is in progress.' }))
    .mockResolvedValueOnce(Response.json({ active:false,message:'' }));
   vi.stubGlobal('fetch',fetch);
   const submit = vi.fn().mockResolvedValue(maintenanceNotSent());
   const storage=vi.spyOn(Storage.prototype,'setItem');
   render(<IntakeMaintenanceProvider><Form submit={submit}/></IntakeMaintenanceProvider>);
   await act(async()=>{});
   fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Alex'}});
   const input=screen.getByLabelText('Name');
   await act(async()=>{await vi.advanceTimersByTimeAsync(30_000);});
   expect(screen.getByRole('status').textContent).toContain('Maintenance');
   expect(screen.getByLabelText('Name')).toBe(input);
   expect((input as HTMLInputElement).value).toBe('Alex');
   expect(submit).not.toHaveBeenCalled();
   await act(async()=>{fireEvent.submit(screen.getByRole('form'));});
   expect(screen.getByRole('alert').textContent).toContain('Your request was not sent');
   await act(async()=>{await vi.advanceTimersByTimeAsync(30_000);});
   expect(screen.getByRole('status').textContent).toContain('Intake has reopened');
   expect(screen.queryByRole('alert')).toBeNull();
   expect(submit).toHaveBeenCalledTimes(1);
   expect((input as HTMLInputElement).value).toBe('Alex');
   expect(storage).not.toHaveBeenCalled();
   expect(fetch).toHaveBeenCalledWith('/api/v1/intake-status',expect.objectContaining({cache:'no-store'}));
   submit.mockResolvedValueOnce({success:true});
   await act(async()=>{fireEvent.submit(screen.getByRole('form'));});
   expect(submit).toHaveBeenCalledTimes(2);
   expect(screen.queryByRole('status')).toBeNull();
   storage.mockRestore();
 });
 it('still explains a server rejection when status fetching fails', async () => {
   vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));
   const submit=vi.fn().mockResolvedValue(maintenanceNotSent());
   render(<IntakeMaintenanceProvider><Form submit={submit}/></IntakeMaintenanceProvider>);
   await act(async()=>{fireEvent.submit(screen.getByRole('form'));});
   expect(screen.getByRole('alert').textContent).toContain('Your request was not sent');
   await act(async()=>{await vi.advanceTimersByTimeAsync(30_000);});
   expect(screen.getByRole('alert').textContent).toContain('Requests are paused');
   expect(screen.queryByRole('status')).toBeNull();
 });
 it('ignores an open status response whose request started before a maintenance refusal', async () => {
   let resolve!: (response: Response) => void;
   const fetch = vi.fn().mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }))
     .mockResolvedValue(Response.json({ active: false, message: '' }));
   vi.stubGlobal('fetch', fetch);
   render(<IntakeMaintenanceProvider><Form submit={vi.fn().mockResolvedValue(maintenanceNotSent())}/></IntakeMaintenanceProvider>);
   await act(async () => { fireEvent.submit(screen.getByRole('form')); });
   await act(async () => { resolve(Response.json({ active: false, message: '' })); });
   expect(screen.getByRole('alert').textContent).toContain('Your request was not sent');
   expect(screen.queryByRole('status')).toBeNull();
   await act(async () => { window.dispatchEvent(new Event('focus')); });
   expect(screen.getByRole('status').textContent).toContain('Intake has reopened');
 });
 it('aborts a hung status read and resumes polling without changing fields or sending a request', async () => {
   const fetch = vi.fn().mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
     init.signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
   })).mockResolvedValue(Response.json({ active: false, message: '' }));
   vi.stubGlobal('fetch', fetch);
   const submit = vi.fn().mockResolvedValue(maintenanceNotSent());
   render(<IntakeMaintenanceProvider><Form submit={submit}/></IntakeMaintenanceProvider>);
   fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alex retained' } });
   await act(async () => { fireEvent.submit(screen.getByRole('form')); });
   await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
   expect(fetch.mock.calls[0]?.[1].signal.aborted).toBe(true);
   expect(screen.getByRole('alert').textContent).toContain('Your request was not sent');
   await act(async () => { await vi.advanceTimersByTimeAsync(25_000); });
   expect(fetch).toHaveBeenCalledTimes(2);
   expect(screen.getByRole('status').textContent).toContain('Intake has reopened');
   expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Alex retained');
   expect(submit).toHaveBeenCalledTimes(1);
 });
});
