select cs.name, max(cs.totalap::NUMERIC) - min(cs.totalap::NUMERIC) as total
from (
       select date, character_stats ->> 'name' as name, character_stats ->> 'totalAP' as totalap from audit where type='character_stats' and date > 1487674800
     ) as cs
group by name
order by total desc;