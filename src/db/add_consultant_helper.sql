-- Helper Function to Add a Consultant safely
-- Usage: select add_new_consultant('email@example.com', 'John Doe');

create or replace function public.add_new_consultant(
    p_email text,
    p_name text
) returns void as $$
begin
    insert into public.consultants (email, name)
    values (p_email, p_name)
    on conflict (email) do nothing;
end;
$$ language plpgsql;

-- Example Usage (Uncomment to run):
-- select add_new_consultant('newconsultant@wadhwani.org', 'New Consultant Name');
