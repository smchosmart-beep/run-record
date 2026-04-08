
CREATE OR REPLACE FUNCTION public.batch_save_speed_records(
  _student_ids UUID[],
  _time_ms_values INT[],
  _classroom_id UUID,
  _record_date TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _session_id UUID;
  _current_slots INT;
  _max_needed_slots INT;
  _sid UUID;
  _slot INT;
  _used_slots INT[];
  _arr_len INT;
BEGIN
  -- 0. 배열 길이 검증
  _arr_len := array_length(_student_ids, 1);
  IF _arr_len IS NULL OR _arr_len = 0 THEN
    RETURN;
  END IF;
  IF _arr_len != array_length(_time_ms_values, 1) THEN
    RAISE EXCEPTION 'Array length mismatch: student_ids(%) vs time_ms_values(%)', _arr_len, array_length(_time_ms_values, 1);
  END IF;

  -- 1. 소유권 검증
  _user_id := auth.uid();
  IF NOT EXISTS (
    SELECT 1 FROM classrooms
    WHERE id = _classroom_id AND user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: not classroom owner';
  END IF;

  -- 2. 세션 확인/생성
  SELECT id, slots_count INTO _session_id, _current_slots
  FROM record_sessions
  WHERE classroom_id = _classroom_id AND session_date = _record_date::date;

  IF _session_id IS NULL THEN
    _current_slots := 0;
    INSERT INTO record_sessions (classroom_id, session_date, slots_count)
    VALUES (_classroom_id, _record_date::date, 1)
    RETURNING id INTO _session_id;
    _current_slots := 1;
  END IF;

  -- 3. 각 학생별 빈 슬롯 계산 + 기록 삽입
  _max_needed_slots := _current_slots;

  FOR i IN 1.._arr_len LOOP
    _sid := _student_ids[i];

    SELECT array_agg(slot_index) INTO _used_slots
    FROM records
    WHERE student_id = _sid AND record_date = _record_date::date;

    IF _used_slots IS NULL THEN
      _used_slots := ARRAY[]::INT[];
    END IF;

    _slot := NULL;
    FOR s IN 0..(_max_needed_slots - 1) LOOP
      IF NOT (s = ANY(_used_slots)) THEN
        _slot := s;
        EXIT;
      END IF;
    END LOOP;

    IF _slot IS NULL THEN
      _slot := _max_needed_slots;
      _max_needed_slots := _max_needed_slots + 1;
    END IF;

    INSERT INTO records (student_id, time_ms, is_dnf, slot_index, record_date, is_attendance)
    VALUES (_sid, _time_ms_values[i], false, _slot, _record_date::date, false);
  END LOOP;

  -- 4. 필요시 slots_count 업데이트
  IF _max_needed_slots > _current_slots THEN
    UPDATE record_sessions
    SET slots_count = _max_needed_slots
    WHERE id = _session_id;
  END IF;
END;
$$;
