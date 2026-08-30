with open(r'C:\Users\USER\OneDrive\Documents\GitHub\Cafeteria\frontend\js\admin.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 3: Move confirmToggleState to global scope (outside barConfigStatus)
# Find barConfigStatus function
idx = content.find('function barConfigStatus(el)')
if idx >= 0:
    brace_count = 0
    end_idx = -1
    for i in range(idx, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i
                break

    if end_idx >= 0:
        # Extract the barConfigStatus function body
        barConfigStatus_code = content[idx:end_idx+1]
        
        # Extract confirmToggleState function from inside
        # Find confirmToggleState inside barConfigStatus
        ct_idx = barConfigStatus_code.find('function confirmToggleState')
        if ct_idx >= 0:
            ct_brace = 0
            ct_end = -1
            for i in range(ct_idx, len(barConfigStatus_code)):
                if barConfigStatus_code[i] == '{':
                    ct_brace += 1
                elif barConfigStatus_code[i] == '}':
                    ct_brace -= 1
                    if ct_brace == 0:
                        ct_end = i
                        break
            
            if ct_end >= 0:
                confirmToggleState_code = barConfigStatus_code[ct_idx:ct_end+1]
                
                # Remove confirmToggleState from inside barConfigStatus
                new_barConfigStatus = barConfigStatus_code[:ct_idx] + barConfigStatus_code[ct_end+1:]
                
                # Remove trailing empty lines
                new_barConfigStatus = new_barConfigStatus.rstrip()
                
                # Replace in content
                content = content[:idx] + new_barConfigStatus + content[end_idx+1:]
                
                # Now insert confirmToggleState at the end of the file (before final })
                # Find the last function end
                last_idx = content.rfind('}\n')
                if last_idx >= 0:
                    new_content = content[:last_idx+1] + '\n\n' + confirmToggleState_code + '\n' + content[last_idx+1:]
                    with open(r'C:\Users\USER\OneDrive\Documents\GitHub\Cafeteria\frontend\js\admin.js', 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print('Moved confirmToggleState to global scope')
                else:
                    print('Could not find end of file')
            else:
                print('Could not find confirmToggleState end')
        else:
            print('confirmToggleState not found inside barConfigStatus')
    else:
        print('Could not find end of barConfigStatus')
else:
    print('barConfigStatus not found')