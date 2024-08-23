# Grouped N3 specification
You can listen to the stream of emitted quads on the `.on('data', (quad)=>{...});` of the N3.StreamParser, but if the
quads are grouped in a certain way, they must be assembled together before emitting. This however defeats the purpose of
listening on the stream, because of the uncertainty of whether any other quads belonging to that grouping will appear later.

In order to remove this uncertainty, the turtle file can be annotated to add grouping boundaries to indicate they can be emitted as a self-contained unit. 

## Groups
Groups can be started with `# @group start <groupName>` and must be closed with `# @group end <groupName>`.
The example below contains three groups, `firstYear`, `secondYear` and `students`. When these groups are parsed, the parser will emit three groups in the following order:
1. Group `firstYear`
2. Group `secondYear`
3. Group `students`
```turtle
# @group start firstYear
ex:FirstYear a ex:Classgroup;
    ex:student ex:Student1, ex:Student2 .
# @group start firstYear

# @group start secondYear
ex:SecondYear a ex:Classgroup;
             ex:student ex:Student2, ex:Student3 .
# @group end secondYear

# @group start students
ex:Student1 a ex:Student;
            contact:fullName "John Doe".

ex:Student2 a ex:Student;
            contact:fullName "Jane Doe".

ex:Student3 a ex:Student;
            contact:fullName "John Deere".
# @group end students
```
## Special cases

### Overlapping groups
When two or more groups overlap, the triples in the overlapping section will be added to all the groups. It is therefore also not important to close the groups in the same order they were opened. 
For example the following turtle file will emit the following groups in the following order:
```turtle
# @group start firstSemester
ex:Course1 a ex:Course;
            rdfs:label "Course 1".
# @group start secondSemester
ex:Course2 a ex:Course;
            rdfs:label "Course 2".
# @group end firstSemester
ex:Course3 a ex:Course;
            rdfs:label "Course 3".
# @group end secondSemester
```
This will result in the following groups:
1. Group `firstSemester` with the following triples:
```turtle
ex:Course1 a ex:Course;
            rdfs:label "Course 1".
ex:Course2 a ex:Course;
            rdfs:label "Course 2".
```
2. Group `secondSemester` with the following triples:
```turtle
ex:Course2 a ex:Course;
           rdfs:label "Course 2".
ex:Course3 a ex:Course;
           rdfs:label "Course 3".
```
### Nested groups
Groups can also be nested infinitely. In order to nest multiple groups, start a new group (child) before closing the previous group (parent). Triples included in the
child group will automatically be contained in all their parent groups.
Nested groups will not keep their hierarchy when emitted, but they will be emitted first in their own group and as a sibling in their parent group when that group is emitted.
An example of this principle can be seen below.

```turtle
# @group start parent1
ex:ParentCollection a tree:Collection;
    tree:member ex:ChildCollection1, ex:ChildCollection2 .

# @group start parent2
ex:ChildCollection1 a tree:Collection;
                    tree:member ex:Subject1, ex:Subject2 .

ex:Subject1 a ex:Subject;
          rdfs:label "Subject 1";
          ex:linkedTo ex:Subject3.

ex:Subject2 a ex:Subject;
            rdfs:label "Subject 2".
# @group end parent2

# @group start parent3
ex:ChildCollection1 a tree:Collection;
                    tree:member ex:Subject3.

ex:Subject3 a ex:Subject;
            rdfs:label "Subject 3";
            ex:linkedTo ex:Subject1.
# @group end parent3
# @group end parent1
```
After parsing, this will emit the following three groups in the following order:
1. Group `parent2`
2. Group `parent3`
3. Group `parent1`

##### Group `parent2`
```turtle
ex:ChildCollection1 a tree:Collection;
                    tree:member ex:Subject1, ex:Subject2 .

ex:Subject1 a ex:Subject;
          rdfs:label "Subject 1";
          ex:linkedTo ex:Subject3.

ex:Subject2 a ex:Subject;
            rdfs:label "Subject 2".
```

##### Group `parent3`
```turtle
ex:ChildCollection1 a tree:Collection;
                    tree:member ex:Subject3.

ex:Subject3 a ex:Subject;
            rdfs:label "Subject 3";
            ex:linkedTo ex:Subject1.
```

##### Group `parent1`
```turtle
ex:ParentCollection a tree:Collection;
    tree:member ex:ChildCollection1, ex:ChildCollection2 .

ex:ChildCollection1 a tree:Collection;
                    tree:member ex:Subject1, ex:Subject2 .

ex:Subject1 a ex:Subject;
          rdfs:label "Subject 1";
          ex:linkedTo ex:Subject3.

ex:Subject2 a ex:Subject;
            rdfs:label "Subject 2".
ex:ChildCollection1 a tree:Collection;
                    tree:member ex:Subject3.

ex:Subject3 a ex:Subject;
            rdfs:label "Subject 3";
            ex:linkedTo ex:Subject1.

```
### Unclosed groups
Any groups that are not closed will be emitted at the end of the file and will include all triples that appear after the group was started until the end of the file.

### Duplicate start/end groups
If a group is started or ended multiple times, the parser will ignore the duplicates and only start/close and emit the group only once.

### Non-grouped triples
Any triples that are not included in any groups will be emitted immediately and will not be part of any other groups.
