import { uuidv7 } from './uuidv7';

describe('uuidv7 utility', () => {
  it('should generate a valid UUIDv7 string with correct format', () => {
    const id = uuidv7();
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(id).toMatch(regex);
  });

  it('should have version 7 and variant 2 in designated bit positions', () => {
    const id = uuidv7();
    const parts = id.split('-');
    expect(parts[2][0]).toBe('7'); // version 7
    expect(['8', '9', 'a', 'b']).toContain(parts[3][0].toLowerCase()); // RFC variant
  });

  it('should be monotonically time-sortable', async () => {
    const id1 = uuidv7();
    await new Promise((r) => setTimeout(r, 5));
    const id2 = uuidv7();

    expect(id1 < id2).toBe(true);
  });
});
